import { UI } from "./ui";
import { UIBinding } from "./ui-binding";

export class UIView {
  public model: any;
  public element: HTMLElement;
  public bindings: UIBinding[] = [];

  public update(): void {
    this.bindings.forEach(binding => binding.updateFromUI());
    this.bindings.forEach(binding => binding.updateToUI());
    this.bindings.forEach(binding => binding.updateAtEvents());
  }

  public destroy(): void {
    this.element.parentElement.removeChild(this.element);
    this.bindings.forEach(binding => binding.unbind());
    const index = UI.views.findIndex(view => view === this);
    UI.views.splice(index, 1);
  }
}
