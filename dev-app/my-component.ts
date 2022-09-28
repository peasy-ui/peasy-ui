export class MyComponent {
  // Queried by parent to create markup
  public static template = `
    <div>Local state: \${item}</div>
  `;

  public item: number;
  public constructor(public state: any) { 
    this.item = state.item * 10;
  }

  public get template(): string {
    return MyComponent.template;
  }

  // Called by parent to create model
  public static create(state): MyComponent {
    const component = new MyComponent(state);
    setInterval(component.update, 200);
    return component;
  }

  public update = (): void => {
    this.item++;
    if (this.item % 10 === 0) {
      this.state.item = Math.floor(this.item / 10);
    }
  }
}
