import { UI } from "./ui";
import { UIAnimation } from "./ui-animation";
import { UIBinding } from "./ui-binding";

export class UIView {
  public state: 'created' | 'bound' | 'attaching' | 'attached' | 'destroyed' = 'created';
  public parent: typeof UI | UIBinding;
  public model: any;
  public element: HTMLElement;
  public bindings: UIBinding[] = [];
  public animations: UIAnimation[] = [];
  public animationQueue: UIAnimation[] = [];
  public destroyed: '' | 'queue' | 'destroy' | 'destroyed' = '';
  public moved: '' | 'queue' | 'move' = '';

  public attached: Promise<UIView>;
  private attachResolve: any;
  private parentElement: HTMLElement;
  private sibling: HTMLElement;

  public static create(parent: HTMLElement, template: HTMLElement, model = {}, options = { parent: null, prepare: true, sibling: null }): UIView {
    const view = new UIView();

    view.model = model;
    view.element = template;
    view.bindings.push(...UI.parse(view.element, model, view));
    view.parentElement = parent;
    view.sibling = options.sibling;

    view.parent = (options.parent ?? UI);

    view.attached = new Promise<UIView>((resolve) => {
      view.attachResolve = resolve;
    });

    return view;
  }

  public destroy(): void {
    // console.log('[view] destroy', this.element, this.model, this.element.getAnimations({ subtree: true }));
    this.element.classList.add('pui-removing');
    this.destroyed = 'queue';
    UI.destroyed.push(this);
  }

  public terminate(): void {
    // console.log('[view] terminate', this.element, this.model, this.element.getAnimations({ subtree: true }));
    Promise.all(
      this.getAnimations()
      // this.element.getAnimations({ subtree: true })
      //   .map(animation => animation.finished)
    ).then(() => {
      // console.log('[view] remove', this.element, this.element.getAnimations({ subtree: true }));
      this.element.parentElement?.removeChild(this.element);
      this.bindings.forEach(binding => binding.unbind());

      const index = this.parent.views.findIndex(view => view === this);
      if (index > -1) {
        this.parent.views.splice(index, 1);
      }
    });
    this.destroyed = 'destroyed';
  }

  public move(sibling: HTMLElement): void {
    // console.log('[view] move', this.element, this.model, this.model.$model.card?.suit, this.model.$model.card?.value, sibling.innerText);
    this.moved = 'queue';
    this.element.classList.add('pui-moving');
    this.sibling = sibling;
  }

  public play(animation: string | UIAnimation, element: HTMLElement): UIAnimation {
    if (typeof animation === 'string') {
      animation = this.animations.find(anim => anim.name === animation).clone();
    }
    animation.element = element;
    animation.state = 'pending';
    this.animationQueue.push(animation);
    this.updateAnimations(performance.now());

    return animation;
  }

  public updateFromUI(): void {
    this.bindings.forEach(binding => binding.updateFromUI());
  }
  public updateToUI(): void {
    this.bindings.forEach(binding => binding.updateToUI());

    switch (this.state) {
      case 'created':
        // console.log('[view] add', this.element, this.model);
        this.element.classList.add('pui-adding');
        this.parentElement.insertBefore(this.element, this.sibling?.nextSibling);
        this.attachResolve();
        this.state = 'attaching';
        break;
      case 'attaching':
        if (
          this.getAnimations(false).length === 0
          // this.element.getAnimations({ subtree: false })
          // .filter(animation => animation.playState !== 'finished').length === 0
        ) {
          this.element.classList.remove('pui-adding');
          this.state = 'attached';
        }
        break;
    }
  }
  public updateAtEvents(): void {
    this.bindings.forEach(binding => binding.updateAtEvents());
  }

  public updateAnimations(now: number): void {
    while (this.animationQueue[0]?.state === 'finished' ?? false) {
      const finished = this.animationQueue.shift();
      finished.destroy();
    }
    for (let i = 0; i < this.animationQueue.length; i++) {
      const animation = this.animationQueue[i];
      if (animation.state !== 'pending') {
        continue;
      }
      if (animation.isBlocked(now)) {
        continue;
      }
      animation.state = 'playing';
      animation.startTime = now;
      animation.animation = animation.element.animate(animation.keyframes, animation.options);
      animation.finished = animation.animation.finished;
      animation.finished.then(() => {
        (animation as UIAnimation).state = 'finished';
        this.updateAnimations(performance.now());
      });
    }
  }

  public updateMove(): void {
    switch (this.moved) {
      case 'queue':
        this.moved = 'move';
        break;
      case 'move':
        // Promise.all(
        //   this.element.getAnimations({ subtree: true })
        //     .map(animation => animation.finished)
        // ).then(() => {
        // if (this.element.getAnimations({ subtree: true }).length === 0) {
        if (this.getAnimations().length === 0) {
          const parent = this.element.parentElement;
          console.log('[view] moving', this.element.nextSibling === this.sibling.nextSibling, '>', (this.element.nextSibling as any).cloneNode(), '<', (this.sibling.nextSibling as any).innerText)
          parent.insertBefore(this.element, this.sibling.nextSibling);
          this.element.classList.remove('pui-moving');
          this.moved = '';
          this.sibling = undefined;
        }
        // });
        break;
    }
    this.bindings.forEach(binding => binding.updateMove());
  }

  private getAnimations(subtree = true) {
    return this.element.getAnimations({ subtree })
      .filter(animation => animation.playState !== 'finished' && animation.effect.getTiming().iterations !== Infinity)
      .map(animation => animation.finished)
  }
}
