import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);

  private requiredPermissions: string[] = [];
  private isRendered = false;

  constructor() {
    // Reactively evaluate whenever user or permissions change
    effect(() => {
      this.updateView();
    });
  }

  @Input()
  set appHasPermission(permission: string | string[]) {
    if (typeof permission === 'string') {
      this.requiredPermissions = [permission];
    } else if (Array.isArray(permission)) {
      this.requiredPermissions = permission;
    } else {
      this.requiredPermissions = [];
    }
    this.updateView();
  }

  private updateView(): void {
    if (!this.requiredPermissions || this.requiredPermissions.length === 0) {
      this.render();
      return;
    }

    const hasAccess = this.authService.hasAnyPermission(this.requiredPermissions);

    if (hasAccess && !this.isRendered) {
      this.render();
    } else if (!hasAccess && this.isRendered) {
      this.clear();
    }
  }

  private render(): void {
    this.viewContainer.clear();
    this.viewContainer.createEmbeddedView(this.templateRef);
    this.isRendered = true;
  }

  private clear(): void {
    this.viewContainer.clear();
    this.isRendered = false;
  }
}
