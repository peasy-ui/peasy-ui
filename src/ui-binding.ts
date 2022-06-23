import { UIView } from './ui-view';
import { UI } from "./ui";

export type IUIBinding = Partial<Omit<UIBinding, 'id'>>;

export type fromUICallback = (newValue: string, oldValue: any, property: string, model: any) => any | void;
export type toUICallback = (newValue: any, oldValue: any, property: string, model: any) => string | void;

export class UIBinding {
  public id: number;
  public parent: typeof UI | UIView;

  public object: any;
  public property: string;

  public context: any;
  public selector: string | Element | Node;
  public attribute: string;
  public value: string | Element; // A fixed value that's always used
  public template: HTMLElement;

  public fromUI: boolean | fromUICallback = false;
  public toUI: boolean | toUICallback = true;
  public atEvent = false;
  public oneTime = false;
  public views: UIView[] = [];

  private $element: Element;
  private lastValue: any;
  private lastUIValue: any;
  private firstUpdate = true;

  private events: Event[] = [];


  public constructor() {
    this.id = ++UI.id;
  }

  public get element(): Element {
    if (this.$element == null) {
      this.$element = (this.selector instanceof Element) || (this.selector instanceof Text) || (this.selector instanceof Comment)
        ? this.selector
        : this.context.querySelector(this.selector);
    }
    return this.$element;
  }
  public set element(element: Element | null) {
    this.$element = element;
  }

  public static create(options: IUIBinding): UIBinding {
    const binding = new UIBinding();

    binding.object = '$model' in options.object ? options.object : { $model: options.object };
    binding.property = options.property;
    binding.context = options.context ?? document;
    binding.selector = options.selector;
    binding.attribute = options.attribute ?? 'innerText';
    binding.value = options.value ?? binding.value;
    binding.template = options.template ?? binding.template;
    binding.fromUI = options.fromUI ?? binding.fromUI;
    binding.toUI = options.toUI ?? binding.toUI;
    binding.atEvent = options.atEvent ?? binding.atEvent;
    binding.oneTime = options.oneTime ?? binding.oneTime;
    binding.parent = options.parent ?? UI;
    binding.addListener();

    if (typeof binding.fromUI !== 'boolean') {
      binding.fromUI = binding.fromUI.bind(binding);
    }
    if (typeof binding.toUI !== 'boolean') {
      binding.toUI = binding.toUI.bind(binding);
    }

    return binding;
  }

  public destroy(): void {
    // console.log('destroy binding', this.element);
    this.element = null;
    this.removeListener();
    this.views.forEach(view => view.destroy());
  }

  public unbind(): void {
    UI.unbind(this);
  }

  public addListener(): void {
    if (this.atEvent) {
      this.toUI = false;
      this.fromUI = false;
      this.element.addEventListener(this.attribute, this.triggerAtEvent);
    }
  }
  public removeListener(): void {
    if (this.atEvent) {
      this.element.removeEventListener(this.attribute, this.triggerAtEvent);
    }
  }

  public updateFromUI(): void {
    if (this.fromUI === false || this.firstUpdate) {
      this.firstUpdate = false;
      this.views.forEach(view => view.updateFromUI());
      return;
    }
    const { target, property } = UI.resolveProperty(this.element, this.attribute);
    const uiValue = target[property];
    if (uiValue !== this.lastUIValue) {
      let value = this.fromUI !== true ? this.fromUI(uiValue, this.lastUIValue, this.property, this.object) : uiValue;
      this.lastUIValue = uiValue;
      if (value !== undefined && value !== this.lastValue) {
        this.lastValue = value;
        const { target, property } = UI.resolveProperty(this.object, this.property);
        if (UI.resolveValue(this.object, this.property) === 'number' && !isNaN(value)) {
          value = +value;
        }
        target[property] = value;
      } else {
        this.lastValue = value;
      }
    }
    this.views.forEach(view => view.updateFromUI());
  }

  public updateToUI(): void {
    if (this.toUI === false) {
      this.views.forEach(view => view.updateToUI());
      return;
    }
    let value = UI.resolveValue(this.object, this.property);
    let listChanged = false;
    if (this.template != null) { // Conditional or iterator
      if (typeof this.attribute === 'boolean') { // Conditional
        if (value !== this.lastValue) {
          const uiValue = this.toUI !== true ? (this.toUI as toUICallback)(value, this.lastValue, this.property, this.object) : value;
          if (uiValue !== undefined && uiValue !== this.lastUIValue) {
            // console.log('Updating toUI');
            if (uiValue === this.attribute) {
              this.views.push(UIView.create(this.element.parentElement, this.template.cloneNode(true) as HTMLElement, this.object, { parent: this, prepare: false, sibling: this.element }));
            } else {
              const view = this.views.pop();
              view?.destroy();
            }
            this.lastValue = value;
            this.lastUIValue = uiValue;
          }
        }
      } else { // Iterator
        if (value == null) {
          value = [];
        }
        const lastValue = this.lastValue ?? [];
        if (value.length !== lastValue.length) {
          listChanged = true;
        } else {
          for (let i = 0, ii = value.length; i < ii; i++) {
            if (value[i] !== lastValue[i]) {
              listChanged = true;
              break;
            }
          }
        }
        if (!listChanged) {
          this.views.forEach(view => view.updateToUI());
          if (this.oneTime) {
            this.oneTimeDone();
          }
          return;
        }

        const uiValue = this.toUI !== true ? (this.toUI as toUICallback)(value, lastValue, this.property, this.object) : value;
        if (uiValue == null) {
          this.views.forEach(view => view.updateToUI());
          if (this.oneTime) {
            this.oneTimeDone();
          }
          return;
        }
        const lastUIValue = this.lastUIValue ?? [];
        let same = 0;
        for (let i = 0, ii = uiValue.length, j = 0; i < ii; i++, j++) {
          if (uiValue[i] === lastUIValue[j]) {
            same++;
          }
          else {
            break;
          }
        }
        if (same === uiValue.length && uiValue.length === lastUIValue.length) {
          this.views.forEach(view => view.updateToUI());
          if (this.oneTime) {
            this.oneTimeDone();
          }
          return;
        }
        const views = this.views.splice(0, same);

        for (let i = same, ii = uiValue.length, j = same; i < ii; i++, j++) {
          const item = uiValue[i];
          if (typeof item !== 'string') {
            item.$index = i;
          }
          const lastDoneUI = views[views.length - 1];
          const view = this.views.shift();
          // New view
          if (view == null) {
            const model = { $model: { [this.attribute]: item }, $parent: this.object };
            views.push(UIView.create(this.element.parentElement, this.template.cloneNode(true) as HTMLElement, model, { parent: this, prepare: false, sibling: lastDoneUI?.element ?? this.element }));
            continue;
          }
          // The same, continue
          if (item === view?.model.$model[this.attribute]) {
            views.push(view);
            view.move(lastDoneUI?.element ?? this.element as HTMLElement);
            continue;
          }
          // Old view is gone
          const uiItem = view?.model.$model[this.attribute];
          if (!uiValue.slice(i).includes(uiItem)) {
            view.destroy();
            i--;
            continue;
          }
          // Moved view
          this.views.unshift(view);
          let found = false;
          for (let j = 0, jj = this.views.length; j < jj; j++) {
            const view = this.views[j];
            if (item === view?.model.$model[this.attribute]) {
              views.push(...this.views.splice(j, 1));

              view.move(lastDoneUI?.element ?? this.element as HTMLElement);
              found = true;
              break;
            }
          }
          // New view
          if (!found) {
            const model = { $model: { [this.attribute]: item }, $parent: this.object };
            views.push(UIView.create(this.element.parentElement, this.template.cloneNode(true) as HTMLElement, model, { parent: this, prepare: false, sibling: lastDoneUI?.element ?? this.element }));
          }
        }
        this.views.forEach(view => view.destroy());
        this.views = views;
        this.lastValue = [...value];
        this.lastUIValue = [...uiValue];
      }
    } else {
      if (value !== this.lastValue) {
        const uiValue = this.toUI !== true ? (this.toUI as toUICallback)(value, this.lastValue, this.property, this.object) : value;
        if (uiValue !== undefined && uiValue !== this.lastUIValue) {
          // console.log('Updating toUI');
          const { target, property } = UI.resolveProperty(this.element, this.attribute);
          target[property] = uiValue;
          this.lastValue = value;
          this.lastUIValue = uiValue;
        }
      }
    }
    this.views.forEach(view => view.updateToUI());
    if (this.oneTime) {
      this.oneTimeDone();
    }
  }

  public oneTimeDone(): void {
    this.toUI = false;
    this.fromUI = false;
    // if (this.views.length === 0 && // Only remove bindings without children
    //   this.template == null || typeof this.attribute !== 'boolean' // NOT Conditional
    // ) {
    //   this.unbind();
    // }
  }

  public updateAtEvents(): void {
    let event = this.events.shift();
    while (event != null) {
      // console.log('UPDATED', this.attribute, event, this.object);
      const callback = UI.resolveValue(this.object, this.property);
      // TODO: Make callback send parent model for iterator/templates?
      callback(event, this.object.$model, this.element, this.attribute, this.object);
      event = this.events.shift();
    }
    this.views.forEach(view => view.updateAtEvents());
  }

  public updateMove(): void {
    this.views.forEach(view => view.updateMove());
  }

  triggerAtEvent = (event): void => {
    // console.log('TRIGGERED', this.attribute, event, this.object);
    this.events.push(event);
  }
}
