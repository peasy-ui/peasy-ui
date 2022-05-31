import { UIView } from './ui-view';
import { UI } from "./ui";

export type IUIBinding = Partial<Omit<UIBinding, 'id'>>;

export type fromUICallback = (newValue: string, oldValue: any, property: string, model: any) => any | void;
export type toUICallback = (newValue: any, oldValue: any, property: string, model: any) => string | void;

export class UIBinding {
  public id: number;

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

  private $element: Element;
  private lastValue: any;
  private lastUIValue: any;
  private firstUpdate = true;

  private events: Event[] = [];

  private uis: UIView[] = [];

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
    binding.addListener();

    return binding;
  }

  public destroy(): void {
    this.element = null;
    this.removeListener();
    this.uis.forEach(ui => ui.destroy());
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
  }

  public updateToUI(): void {
    if (this.toUI === false) {
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
              this.uis.push(UI.create(this.element.parentElement, this.template.cloneNode(true) as HTMLElement, this.object, { prepare: false, sibling: this.element }));
            } else {
              const ui = this.uis.pop();
              ui?.destroy();
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
          return;
        }

        const uiValue = this.toUI !== true ? (this.toUI as toUICallback)(value, lastValue, this.property, this.object) : value;
        if (uiValue == null) {
          return;
        }
        const lastUIValue = this.lastUIValue ?? [];
        let same = 0;
        for (let i = uiValue.length - 1, j = lastUIValue.length - 1; i >= 0; i--, j--) {
          if (uiValue[i] === lastUIValue[j]) {
            same++;
          }
          else {
            break;
          }
        }
        if (same === uiValue.length && uiValue.length === lastUIValue.length) {
          return;
        }
        // console.log('Updating toUI');
        const uis = this.uis.splice(this.uis.length - same);

        for (let i = uiValue.length - 1 - same, j = lastUIValue.length - 1 - same; i >= 0; i--, j--) {
          const item = uiValue[i];
          const lastDoneUI = uis[0];
          const ui = this.uis.pop();
          // New ui
          if (ui == null) {
            const model = { $model: { [this.attribute]: item }, $parent: this.object };
            uis.unshift(UI.create(this.element.parentElement, this.template.cloneNode(true) as HTMLElement, model, { prepare: false, sibling: lastDoneUI?.element ?? this.element }));
            continue;
          }
          // The same, continue
          if (item === ui?.model.$model[this.attribute]) {
            uis.unshift(ui);
            continue;
          }
          // Old ui is gone
          const uiItem = ui?.model.$model[this.attribute];
          let found = false;
          for (let k = i - 1; k >= 0; k--) {
            if (uiItem === uiValue[k]) {
              found = true;
              break;
            }
          }
          if (!found) {
            ui.destroy();
            i++;
            continue;
          }
          // Moved ui
          this.uis.push(ui);
          found = false;
          for (let j = 0, jj = this.uis.length - 1; j < jj; j++) {
            const ui = this.uis[j];
            if (item === ui?.model.$model[this.attribute]) {
              uis.unshift(...this.uis.splice(j, 1));
              const parent = ui.element.parentElement;
              parent.removeChild(ui.element);
              parent.insertBefore(ui.element, lastDoneUI?.element)
              found = true;
              break;
            }
          }
          // New ui
          if (!found) {
            const model = { $model: { [this.attribute]: item }, $parent: this.object };
            uis.unshift(UI.create(this.element.parentElement, this.template.cloneNode(true) as HTMLElement, model, { prepare: false, sibling: lastDoneUI?.element ?? this.element }));
          }
        }
        this.uis.forEach(ui => ui.destroy());
        this.uis = uis;
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
  }

  triggerAtEvent = (event): void => {
    // console.log('TRIGGERED', this.attribute, event, this.object);
    this.events.push(event);
  }
}
