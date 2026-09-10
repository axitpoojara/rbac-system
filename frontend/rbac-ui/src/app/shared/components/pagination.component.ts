import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pagination-wrapper" *ngIf="totalCount > 0">
      <div class="pagination-info">
        Showing <strong>{{ startItem }}</strong> to <strong>{{ endItem }}</strong> of <strong>{{ totalCount }}</strong> entries
      </div>
      
      <div class="pagination-controls">
        <div class="page-size-selector">
          <label>Rows per page:</label>
          <select [value]="pageSize" (change)="onPageSizeSelect($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="25">25</option>
            <option [value]="50">50</option>
          </select>
        </div>

        <button class="btn btn-secondary btn-sm" [disabled]="pageNumber <= 1" (click)="goToPage(pageNumber - 1)">
          ‹ Previous
        </button>

        <span class="page-indicator">
          Page {{ pageNumber }} of {{ totalPages || 1 }}
        </span>

        <button class="btn btn-secondary btn-sm" [disabled]="pageNumber >= totalPages" (click)="goToPage(pageNumber + 1)">
          Next ›
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pagination-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 0 0.5rem;
      border-top: 1px solid var(--border-color);
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .page-size-selector select {
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      background-color: white;
    }
    .page-indicator {
      font-weight: 500;
      color: var(--text-main);
    }
  `]
})
export class PaginationComponent {
  @Input() pageNumber = 1;
  @Input() pageSize = 10;
  @Input() totalCount = 0;
  @Input() totalPages = 1;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get startItem(): number {
    return this.totalCount === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    const end = this.pageNumber * this.pageSize;
    return end > this.totalCount ? this.totalCount : end;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.pageNumber) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSizeChange.emit(Number(target.value));
  }
}
