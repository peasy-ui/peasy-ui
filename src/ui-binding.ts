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

  public fromUI: boolean | fromUICallback = false;
  public toUI: boolean | toUICallback = true;
  public atEvent = false;

  private $element: Element;
  private lastValue: any;
  private lastUIValue: string;
  private firstUpdate = true;

  private events: Event[] = [];

  public constructor() {
    this.id = ++UI.id;
  }

  public get element(): Element {
    if (this.$element == null) {
      this.$element = (this.selector instanceof Element) || (this.selector instanceof Text) ? this.selector : this.context.querySelector(this.selector);
    }
    return this.$element;
  }
  public set element(element: Element | null) {
    this.$element = element;
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
        if (typeof target[property] === 'number' && !isNaN(value)) {
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
    // const toggleAttributes = ['checked'];
    const { target, property } = UI.resolveProperty(this.object, this.property);
    const value = target[property];
    if (value !== this.lastValue) {
      // if (this.attribute === 'checked') debugger;
      const uiValue = this.toUI !== true ? (this.toUI as toUICallback)(value, this.lastValue, this.property, this.object) : value;
      this.lastValue = value;
      if (uiValue !== undefined && uiValue !== this.lastUIValue) {
        const { target, property } = UI.resolveProperty(this.element, this.attribute);
        // if (toggleAttributes.includes(property)) {
        //   if (uiValue) {
        //     target.setAttribute(property, uiValue);
        //   } else {
        //     target.removeAttribute(property);
        //   }
        // } else {
        target[property] = uiValue;
        // }
        this.lastUIValue = uiValue;
      }
    }
  }

  public updateAtEvents(): void {
    let event = this.events.shift();
    while (event != null) {
      // console.log('UPDATED', this.attribute, event, this.object);
      const { target, property } = UI.resolveProperty(this.object, this.property);
      const callback = target[property];
      callback(event, this.object, this.element, this.attribute);
      event = this.events.shift();
    }
  }

  triggerAtEvent = (event): void => {
    // console.log('TRIGGERED', this.attribute, event, this.object);
    this.events.push(event);
  }
}
