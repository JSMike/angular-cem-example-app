export class CemWorkspaceExampleElement extends HTMLElement {
  constructor() {
    super();
    this.variant = 'primary';
    this.workspaceOnly = 'Typed from the workspace package class';
  }
}

if (!customElements.get('cem-workspace-example')) {
  customElements.define('cem-workspace-example', CemWorkspaceExampleElement);
}
