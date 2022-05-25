import { IUIBinding, UIBinding } from "./ui-binding";
import { UIView } from "./ui-view";

export class UI {
  public static uis = {};
  public static id = 0;

  public static views: UIView[] = [];

  public static leaveAttributes = false;

  private static regexReplace = /([\S\s]*?)\$\{([^}]*?[<=@]=[=>][^}]*?)\}([\S\s]*)/m;
  private static regexValue = /([\S\s]*?)\$\{([\s\S]*?)\}([\S\s]*)/m;
  private static regexAttribute = /^\s*(\S*?)\s*([<=@])=([=>])\s*(\S*?)\s*$/;

  private static bindingCounter = 0;

  public static create(parent: Element, template: string, model = {}): UIView {
    const view = new UIView();

    const container = document.createElement('div');
    container.innerHTML = UI.prepare(template);
    const element = container.firstElementChild as HTMLElement;
    view.element = element;
    view.bindings.push(...UI.parse(element, model));
    parent.appendChild(element);

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
    } else {
      bindings.push(...Object.keys(element.attributes ?? []).reverse().map((attribute): UIBinding[] => {
        const bindings: UIBinding[] = [];
        const attr = element.attributes[attribute];
        if (attr.name.startsWith('pui.')) {
          const match = attr.value.match(UI.regexAttribute);
          let [_ignore, name, toUI, fromUI, value] = match;
          let fixedValue;
          if (toUI !== '@') {
            const fixed = name.match(/^'(.*?)'$/);
            if (fixed != null) {
              fixedValue = fixed[1];
              element.setAttribute('value', fixedValue);
              name = element.nodeName.toLowerCase() === 'option' ? 'selected' : 'checked';
              fromUI = value => value ? fixedValue : undefined;
              toUI = value => value === fixedValue;
            } else if (name === '') {
              const { target, property } = UI.resolveProperty(object, value);
              target[property] = element;
              // console.log('REF', property, target);
              if (!UI.leaveAttributes) {
                element.removeAttribute(attr.name);
              }
              return [];
            } else if (name !== 'checked') {
              element.setAttribute(name, '');
            }
          }
          if (!UI.leaveAttributes) {
            element.removeAttribute(attr.name);
          }
          return [UI.bind({
            selector: element, attribute: name, value: fixedValue, object, property: value,
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
            toUI: (_newValue: any, _oldValue: any, _name: string, model: any): void => {
              const value = parts.map((part, index) => {
                if (index % 2 === 0) {
                  return part;
                }
                const { target, property } = UI.resolveProperty(model, part);
                return target[property];
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
      bindings.push(...Array.from(element.childNodes).map(child => UI.parse(child as HTMLElement, object)).flat());
    }
    return bindings;
  }

  // public static parse(element: Element, object: any): UIBinding[] {
  //   const bindings: UIBinding[] = [];
  //   const regex = /([\S\s]*?)\$\{([\s\S]*?)\}([\S\s]*)/m;
  //   if (element.nodeType === 3) { // text
  //     let text = element.textContent;
  //     let match = text.match(regex);
  //     while (match != null) {
  //       const first = match[1];
  //       const property = match[2];
  //       text = match[3];

  //       let clone = element.cloneNode() as Element;
  //       element.textContent = first;
  //       element.parentElement.insertBefore(clone, element.nextElementSibling);
  //       bindings.push(UI.bind({ selector: clone, attribute: 'textContent', object, property }));
  //       element = clone;

  //       clone = element.cloneNode() as Element;
  //       clone.textContent = text;
  //       element.parentElement.insertBefore(clone, element.nextElementSibling);
  //       element = clone;
  //       match = text.match(regex);
  //     }
  //   } else {
  //     bindings.push(...Object.keys(element.attributes ?? []).map((attribute): UIBinding[] => {
  //       const bindings: UIBinding[] = [];
  //       const attr = element.attributes[attribute];
  //       let match = attr.name.match(regex);
  //       if (match != null) {
  //         match = match[2];
  //         match = match.match(/^\s*(\S*?)([+-@])-([+-])(\S*?)\s*$/);
  //         let [_ignore, name, toUI, fromUI, value] = match;
  //         let fixedValue;
  //         if (toUI !== '@') {
  //           const fixed = name.match(/^'(.*?)'$/);
  //           if (fixed != null) {
  //             fixedValue = fixed[1];
  //             element.setAttribute('value', fixedValue);
  //             name = element.nodeName.toLowerCase() === 'option' ? 'selected' : 'checked';
  //             fromUI = value => value ? fixedValue : undefined;
  //             toUI = value => value === fixedValue;
  //           } else if (name === '') {
  //             const { target, property } = UI.resolveProperty(object, value);
  //             target[property] = element;
  //             // const binding = UI.bind({
  //             //   selector: element, attribute: 'name', value: element, object, property: value,
  //             //   toUI: false, fromUI: true, atEvent: false,
  //             // });
  //             // binding.updateFromUI(true);
  //             // UI.unbind(binding);
  //             return [];
  //           } else if (name !== 'checked') {
  //             element.setAttribute(name, '');
  //           }
  //         }
  //         return [UI.bind({
  //           selector: element, attribute: name, value: fixedValue, object, property: value,
  //           toUI: typeof toUI === 'string' ? toUI === '+' : toUI,
  //           fromUI: typeof fromUI === 'string' ? fromUI === '+' : fromUI,
  //           atEvent: toUI === '@',
  //         })];
  //       }
  //       const parts = [attr.value];
  //       let index = 0;
  //       match = parts[index].match(regex);
  //       while (match != null) {
  //         const [_ignore, before, property, after] = match;
  //         bindings.push(UI.bind({
  //           selector: element, attribute: attr.name, object, property,
  //           toUI: (_newValue: any, _oldValue: any, _name: string, model: any): void => {
  //             const value = parts.map((part, index) => {
  //               if (index % 2 === 0) {
  //                 return part;
  //               }
  //               const { target, property } = UI.resolveProperty(model, part);
  //               return target[property];
  //             }).join('');
  //             element.setAttribute(attr.name, value);
  //           }
  //         }));
  //         parts[index++] = before;
  //         parts[index++] = property;
  //         parts[index] = after;
  //         match = parts[index].match(regex);
  //       }
  //       return bindings;
  //     }).flat());
  //     bindings.push(...Array.from(element.childNodes).map(child => UI.parse(child as HTMLElement, object)).flat());
  //   }
  //   return bindings;
  // }

  public static bind(options: IUIBinding): UIBinding {
    const binding = new UIBinding();
    binding.object = options.object;
    binding.property = options.property;
    binding.context = options.context ?? document;
    binding.selector = options.selector;
    binding.attribute = options.attribute ?? 'innerText';
    binding.value = options.value ?? binding.value;
    binding.fromUI = options.fromUI ?? binding.fromUI;
    binding.toUI = options.toUI ?? binding.toUI;
    binding.atEvent = options.atEvent ?? binding.atEvent;
    binding.addListener();

    UI.uis[binding.id] = binding;
    return binding;
  }

  public static unbind(binding: UIBinding): void {
    binding.element = null;
    binding.removeListener();
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
    let target = object;
    while (properties.length > 1) {
      target = target[properties.shift()];
    }
    return { target, property: properties[0] };
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

    // template = original;
    // template = template
    //   .replace(/\s*==>\s*/g, '--+')
    //   .replace(/\s*<==\s*/g, '+--')
    //   .replace(/\s*<=>\s*/g, '+-+')
    //   .replace(/\s*@=>\s*/g, '@-+');

    // console.log('TEMPLATE', template);

    return template;
  }
}
