import { UI } from './ui';
import { UIView } from './ui-view';
export interface UIKeyframeEffectOptions extends KeyframeEffectOptions {
  blocking?: 'none' | 'block' | 'chain';
  blockDuration?: number;
}

export type IUIAnimation = Partial<Omit<UIAnimation, 'play' | 'clone' | 'animation'>>;

export class UIAnimation {

  public name: string;
  public view: UIView;
  public element: HTMLElement;
  public keyframes: Keyframe[] | PropertyIndexedKeyframes;
  public options: UIKeyframeEffectOptions;

  public blocking: 'none' | 'block' | 'chain' = 'none';
  public blockDuration = -1;
  public chain: UIAnimation;

  public state: 'idle' | 'pending' | 'playing' | 'finished' = 'idle';
  public startTime: number;
  public finished: Promise<Animation>;

  public animation: Animation;

  public static create(options: IUIAnimation): UIAnimation {
    const animation = new UIAnimation();

    animation.name = options.name ?? animation.name;
    animation.keyframes = options.keyframes ?? animation.keyframes;
    animation.options = options.options ?? animation.options;

    animation.blocking = options.blocking ?? animation.blocking;
    animation.blockDuration = options.blockDuration ?? (options.options?.duration as number) ?? animation.blockDuration;
    animation.chain = options.chain ?? animation.chain;
    animation.view = options.view ?? UI.globals ?? animation.view;

    if (animation.chain == null) {
      const q = animation.view.animationQueue;
      animation.chain = q[q.length - 1];
    }

    if (animation.name != null) {
      animation.view.animations.push(animation);
    }

    if (options.element != null) {
      animation.play(options.element);
    }

    // console.log('NEW ANIMATION', animation);

    return animation;
  }

  public destroy(): void {
    this.view = null;
    this.element = null;
    this.keyframes = null;
    this.options = null;
    this.chain = null;
    this.finished = null;
    this.animation = null;
  }

  public isBlocking(now: number): boolean {
    if (this.blocking === 'none' || this.state === 'idle') {
      return false;
    }
    if (this.state === 'pending') {
      return true;
    }
    if (this.blocking === 'chain') {
      return this.state !== 'finished';
    }
    return this.startTime + this.blockDuration < now;
  }

  public isBlocked(now: number): boolean {
    const chain = this.chain;
    if (chain == null) {
      return false;
    }
    if (chain.state === 'idle' || chain.state === 'pending') {
      return true;
    }
    // console.log('>>', chain.startTime, chain.blockDuration, now, chain.startTime + chain.blockDuration > now);
    return chain.startTime + chain.blockDuration > now;
  }

  public play(element?: HTMLElement): UIAnimation {
    return this.view.play(this, element ?? this.element);
  }

  public clone(): UIAnimation {
    return UIAnimation.create({
      name: this.name,
      view: this.view,
      keyframes: this.keyframes,
      options: this.options,
      blocking: this.blocking,
      blockDuration: this.blockDuration,
    });
  }
}
