import { IUIBinding, UIBinding } from "./ui-binding";
import { UIView } from "./ui-view";

export class UI {
  public static uis = {};
  public static id = 0;

  public static views: UIView[] = [];

  public static leaveAttributes = false;

  private static regexReplace = /([\S\s]*?)\$\{([^}]*?[<=@!]=[*=>][^}]*?)\}([\S\s]*)/m;
  private static regexAttribute = /^\s*(\S*?)\s*([<=@!])=([*=>])\s*(\S*?)\s*$/;
  private static regexValue = /([\S\s]*?)\$\{([\s\S]*?)\}([\S\s]*)/m;

  private static bindingCounter = 0;

  public static create(parent: Element, template: string | HTMLElement, model = {}, options = { prepare: true, sibling: null }): UIView {
    const view = new UIView();

    view.model = model;
    if (typeof template == 'string') {
      const container = document.createElement('div');
      container.innerHTML = options.prepare ? UI.prepare(template) : template;
      view.element = container.firstElementChild as HTMLElement;
    } else {
      view.element = template;
    }
    view.bindings.push(...UI.parse(view.element, model));
    parent.insertBefore(view.element, options.sibling);

    UI.views.push(view);
    return view;
  }

  public static parse(element: Element, object: any): UIBinding[] {
    const bindings: UIBinding[] = [];
    if (element.nodeType === 3) { // text
      let text = element.textContent;
      let match = text.match(UI.regexValue);
      while (match != null) {
        const first = match[1];
        const property = match[2];
        text = match[3];

        let clone = element.cloneNode() as Element;
        element.textContent = first;
        element.parentElement.insertBefore(clone, element.nextElementSibling);
        bindings.push(UI.bind({ selector: clone, attribute: 'textContent', object, property }));
        element = clone;

        clone = element.cloneNode() as Element;
        clone.textContent = text;
        element.parentElement.insertBefore(clone, element.nextElementSibling);
        element = clone;
        match = text.match(UI.regexValue);
      }
    }
    else {
      bindings.push(...Object.keys(element.attributes ?? []).reverse().map((attribute): UIBinding[] => {
        const bindings: UIBinding[] = [];
        if (element instanceof Comment) {
          return [];
        }
        const attr = element.attributes[attribute];
        if (attr.name.startsWith('pui.')) {
          const match = attr.value.match(UI.regexAttribute);
          let [_ignore, name, toUI, fromUI, value] = match;
          let fixedValue;
          let template;
          if (toUI !== '@') {
            const fixed = name.match(/^'(.*?)'$/);
            if (fixed != null) { // 'value' ==> fixed value
              fixedValue = fixed[1];
              element.setAttribute('value', fixedValue);
              name = element.nodeName.toLowerCase() === 'option' ? 'selected' : 'checked';
              fromUI = value => value ? fixedValue : undefined;
              toUI = value => value === fixedValue;
            } else if (name === '') {
              if (fromUI === '>') { // ==> reference
                const { target, property } = UI.resolveProperty(object, value);
                target[property] = element;
                return [];
              } else { // === or !== conditional
                const comment = document.createComment(attr.name);
                element.parentNode.insertBefore(comment, element);
                element.parentNode.removeChild(element);
                element.removeAttribute(attr.name);
                template = element;
                element = comment as unknown as Element;
                name = toUI === '=';
                toUI = true;
              }
            } else if (fromUI === '*') { // *=> event
              const comment = document.createComment(attr.name);
              element.parentNode.insertBefore(comment, element);
              element.parentNode.removeChild(element);
              element.removeAttribute(attr.name);
              template = element;
              element = comment as unknown as Element;
            } else if (name !== 'checked') {
              element.setAttribute(name, '');
            }
          }
          return [UI.bind({
            selector: element, attribute: name, value: fixedValue, object, property: value, template,
            toUI: typeof toUI === 'string' ? toUI === '<' : toUI,
            fromUI: typeof fromUI === 'string' ? fromUI === '>' : fromUI,
            atEvent: toUI === '@',
          })];
        }
        const parts = [attr.value];
        let index = 0;
        let match = parts[index].match(UI.regexValue);
        while (match != null) {
          const [_ignore, before, property, after] = match;
          bindings.push(UI.bind({
            selector: element, attribute: attr.name, object, property,
            toUI: (newValue: any, _oldValue: any, _name: string, model: any): void => {
              const value = parts.map((part, index) => {
                if (index % 2 === 0) {
                  return part;
                }
                return UI.resolveValue(model, part);
              }).join('');
              element.setAttribute(attr.name, value);
            }
          }));
          parts[index++] = before;
          parts[index++] = property;
          parts[index] = after;
          match = parts[index].match(UI.regexValue);
        }
        return bindings;
      }).flat());

      // It's a repeater, clear all bindings except the template
      if (element instanceof Comment) {
        return bindings.filter(binding => {
          if (binding.template != null) {
            return true;
          }
          binding.unbind();
          return false;
        });
      }

      if (!UI.leaveAttributes) {
        for (let i = Object.keys(element.attributes ?? []).length - 1; i >= 0; i--) {
          const attr = element.attributes[Object.keys(element.attributes ?? [])[i]];
          if (attr.name.startsWith('pui.')) {
            element.removeAttribute(attr.name);
          }
        }
      }

      bindings.push(...Array.from(element.childNodes).map(child => UI.parse(child as HTMLElement, object)).flat());
    }
    return bindings;
  }

  public static bind(options: IUIBinding): UIBinding {
    const binding = UIBinding.create(options);
    UI.uis[binding.id] = binding;
    return binding;
  }

  public static unbind(binding: UIBinding): void {
    binding.destroy();
    delete UI.uis[binding.id];
  }

  public static update(): void {
    // console.log('UI.update', Object.keys(UI.uis).length);
    for (const id in UI.uis) {
      const binding = UI.uis[id];
      binding.updateFromUI();
    }
    for (const id in UI.uis) {
      const binding = UI.uis[id];
      binding.updateToUI();
    }
    for (const id in UI.uis) {
      const binding = UI.uis[id];
      binding.updateAtEvents();
    }
  }

  public static resolveProperty(object: any, property: string): { target: any; property: string } {
    property = property.replace('[', '.').replace(']', '.');
    const properties = property.split('.').filter(prop => (prop ?? '').length > 0);
    let target = '$model' in object ? object.$model : object;
    while (properties.length > 1) {
      target = target[properties.shift()];
    }
    return { target, property: properties[0] };
  }

  public static resolveValue(object: any, prop: string): any {
    let guard = 0;
    do {
      const { target, property } = UI.resolveProperty(object, prop);
      if (property in target) {
        return target[property];
      }
      object = object.$parent;
    } while (object != null && guard++ < 1000);
  }

  private static prepare(template: string): string {
    // const original = template;
    let remaining = template;
    template = '';
    let match = remaining.match(UI.regexReplace);
    while (match != null) {
      const [_ignore, before, binding, after] = match;
      template += `${before} PUI.${UI.bindingCounter++}="${binding}" `;
      // console.log('BINDING', binding);
      remaining = after;
      match = remaining.match(UI.regexReplace);
    }
    template += remaining;

    return template;
  }
}
