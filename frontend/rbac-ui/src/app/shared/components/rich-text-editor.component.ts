import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true
    }
  ],
  template: `
    <div class="rte-container" [class.is-source-mode]="isSourceMode">
      <!-- Toolbar -->
      <div class="rte-toolbar">
        <div class="rte-toolbar-group">
          <!-- Undo / Redo -->
          <button type="button" class="rte-btn" (click)="exec('undo')" title="Undo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
            </svg>
          </button>
          <button type="button" class="rte-btn" (click)="exec('redo')" title="Redo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"></path>
            </svg>
          </button>
        </div>

        <div class="rte-separator"></div>

        <!-- Heading Dropdown -->
        <div class="rte-toolbar-group">
          <select class="rte-select" (change)="formatBlock($event)" title="Text Format">
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="pre">Code Block</option>
          </select>
        </div>

        <div class="rte-separator"></div>

        <!-- Basic Styling -->
        <div class="rte-toolbar-group">
          <button type="button" class="rte-btn font-bold" (click)="exec('bold')" title="Bold (Ctrl+B)">B</button>
          <button type="button" class="rte-btn font-italic" (click)="exec('italic')" title="Italic (Ctrl+I)">I</button>
          <button type="button" class="rte-btn font-underline" (click)="exec('underline')" title="Underline (Ctrl+U)">U</button>
          <button type="button" class="rte-btn font-strike" (click)="exec('strikeThrough')" title="Strikethrough">S</button>
        </div>

        <div class="rte-separator"></div>

        <!-- Text Colors -->
        <div class="rte-toolbar-group">
          <label class="rte-color-picker" title="Text Color">
            <span class="color-indicator" [style.background]="currentColor">A</span>
            <input type="color" (change)="changeColor($event, 'foreColor')" [value]="currentColor" />
          </label>
          <label class="rte-color-picker" title="Highlight Color">
            <span class="color-indicator bg-highlight" [style.background]="currentBgColor">🖌</span>
            <input type="color" (change)="changeColor($event, 'hiliteColor')" [value]="currentBgColor" />
          </label>
        </div>

        <div class="rte-separator"></div>

        <!-- Alignment -->
        <div class="rte-toolbar-group">
          <button type="button" class="rte-btn" (click)="exec('justifyLeft')" title="Align Left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="21" y1="6" x2="3" y2="6"></line><line x1="15" y1="12" x2="3" y2="12"></line><line x1="17" y1="18" x2="3" y2="18"></line>
            </svg>
          </button>
          <button type="button" class="rte-btn" (click)="exec('justifyCenter')" title="Align Center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="6"></line><line x1="21" y1="12" x2="3" y2="12"></line><line x1="18" y1="18" x2="6" y2="18"></line>
            </svg>
          </button>
          <button type="button" class="rte-btn" (click)="exec('justifyRight')" title="Align Right">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="12" x2="9" y2="12"></line><line x1="21" y1="18" x2="7" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="rte-separator"></div>

        <!-- Lists & Indent -->
        <div class="rte-toolbar-group">
          <button type="button" class="rte-btn" (click)="exec('insertUnorderedList')" title="Bullet List">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="9" y1="6" x2="20" y2="6"></line><line x1="9" y1="12" x2="20" y2="12"></line><line x1="9" y1="18" x2="20" y2="18"></line>
              <circle cx="4" cy="6" r="2" fill="currentColor"></circle><circle cx="4" cy="12" r="2" fill="currentColor"></circle><circle cx="4" cy="18" r="2" fill="currentColor"></circle>
            </svg>
          </button>
          <button type="button" class="rte-btn" (click)="exec('insertOrderedList')" title="Numbered List">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line>
              <path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
            </svg>
          </button>
          <button type="button" class="rte-btn" (click)="insertHorizontalRule()" title="Divider Line">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
            </svg>
          </button>
        </div>

        <div class="rte-separator"></div>

        <!-- Links & Clear -->
        <div class="rte-toolbar-group">
          <button type="button" class="rte-btn" (click)="createLink()" title="Insert Link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path>
            </svg>
          </button>
          <button type="button" class="rte-btn" (click)="exec('removeFormat')" title="Clear Formatting">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 4h12M12 4v16M4 20l4-4M16 20l4-4"></path>
            </svg>
          </button>
        </div>

        <div class="rte-separator"></div>

        <!-- Dynamic Placeholder Inserter -->
        <div class="rte-toolbar-group" *ngIf="parsedVariables.length > 0">
          <div class="rte-var-dropdown-wrapper">
            <button type="button" class="rte-btn btn-insert-var" (click)="toggleVarDropdown()" title="Insert Dynamic Variable">
              <span class="var-badge-icon">&#123;&nbsp;&#125;</span>
              <span>Insert Variable</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="rte-var-dropdown" *ngIf="showVarDropdown">
              <div class="rte-var-dropdown-header">Available Placeholders</div>
              <button
                type="button"
                class="rte-var-item"
                *ngFor="let v of parsedVariables"
                (mousedown)="$event.preventDefault(); insertVariable(v)"
              >
                <code>{{ v }}</code>
              </button>
            </div>
          </div>
        </div>

        <!-- Mode Toggle (Visual vs HTML Code) -->
        <div class="rte-toolbar-group ml-auto">
          <button
            type="button"
            class="rte-btn rte-mode-toggle"
            [class.active]="isSourceMode"
            (click)="toggleSourceMode()"
            title="Toggle HTML Source Code View"
          >
            <span *ngIf="!isSourceMode">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              &lt;HTML Code&gt;
            </span>
            <span *ngIf="isSourceMode">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
              </svg>
              Visual View
            </span>
          </button>
        </div>
      </div>

      <!-- Editor Content Area -->
      <div class="rte-body">
        <!-- Visual WYSIWYG View -->
        <div
          #editorContent
          class="rte-content"
          [style.display]="isSourceMode ? 'none' : 'block'"
          contenteditable="true"
          (input)="onContentInput()"
          (blur)="onBlur()"
          (focus)="onFocus()"
          [attr.placeholder]="placeholder"
        ></div>

        <!-- HTML Source View -->
        <textarea
          class="rte-source-textarea"
          [style.display]="isSourceMode ? 'block' : 'none'"
          [(ngModel)]="sourceHtml"
          (ngModelChange)="onSourceCodeChange($event)"
          spellcheck="false"
          placeholder="Paste or write HTML code here..."
        ></textarea>
      </div>
    </div>
  `,
  styles: [`
    .rte-container {
      border: 1px solid var(--border-color, #cbd5e1);
      border-radius: 8px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .rte-container:focus-within {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .rte-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      user-select: none;
    }

    .rte-toolbar-group {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .rte-separator {
      width: 1px;
      height: 20px;
      background: #e2e8f0;
      margin: 0 4px;
    }

    .rte-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 30px;
      min-width: 30px;
      padding: 0 6px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: #475569;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .rte-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .rte-btn:active {
      background: #cbd5e1;
    }

    .rte-btn.font-bold { font-weight: 800; font-family: serif; }
    .rte-btn.font-italic { font-style: italic; font-family: serif; }
    .rte-btn.font-underline { text-decoration: underline; }
    .rte-btn.font-strike { text-decoration: line-through; }

    .rte-select {
      height: 30px;
      padding: 0 8px;
      font-size: 13px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      background: #ffffff;
      color: #334155;
      outline: none;
      cursor: pointer;
    }

    .rte-select:focus {
      border-color: #6366f1;
    }

    .rte-color-picker {
      position: relative;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
    }

    .rte-color-picker input[type="color"] {
      opacity: 0;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }

    .color-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      border: 1px solid #cbd5e1;
      color: #ffffff;
    }

    .color-indicator.bg-highlight {
      color: #0f172a;
    }

    /* Variable dropdown */
    .rte-var-dropdown-wrapper {
      position: relative;
    }

    .btn-insert-var {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      color: #4338ca;
      font-size: 12px;
      font-weight: 600;
      gap: 6px;
      padding: 0 10px;
    }

    .btn-insert-var:hover {
      background: #e0e7ff;
      border-color: #a5b4fc;
      color: #3730a3;
    }

    .var-badge-icon {
      font-family: monospace;
      font-weight: bold;
    }

    .rte-var-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      width: 240px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
      z-index: 50;
      padding: 6px 0;
      max-height: 250px;
      overflow-y: auto;
    }

    .rte-var-dropdown-header {
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      border-bottom: 1px solid #f1f5f9;
    }

    .rte-var-item {
      width: 100%;
      text-align: left;
      padding: 8px 12px;
      background: transparent;
      border: none;
      font-size: 13px;
      cursor: pointer;
      display: block;
      transition: background-color 0.15s;
    }

    .rte-var-item:hover {
      background: #f1f5f9;
    }

    .rte-var-item code {
      background: #f8fafc;
      padding: 2px 6px;
      border-radius: 4px;
      color: #4f46e5;
      font-size: 12px;
      font-family: monospace;
      border: 1px solid #e0e7ff;
    }

    .ml-auto {
      margin-left: auto;
    }

    .rte-mode-toggle {
      font-size: 12px;
      gap: 6px;
      padding: 0 10px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
    }

    .rte-mode-toggle.active {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }

    /* Content Area */
    .rte-body {
      min-height: 360px;
      position: relative;
    }

    .rte-content {
      min-height: 360px;
      padding: 20px;
      outline: none;
      line-height: 1.6;
      font-size: 14px;
      color: #1e293b;
      overflow-y: auto;
    }

    .rte-content:empty:before {
      content: attr(placeholder);
      color: #94a3b8;
      pointer-events: none;
    }

    .rte-source-textarea {
      width: 100%;
      min-height: 360px;
      padding: 16px;
      border: none;
      outline: none;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
      color: #0f172a;
      background: #f8fafc;
      resize: vertical;
      box-sizing: border-box;
    }
  `]
})
export class RichTextEditorComponent implements OnInit, OnChanges, ControlValueAccessor {
  @ViewChild('editorContent', { static: true }) editorContent!: ElementRef<HTMLDivElement>;

  @Input() value = '';
  @Input() placeholder = 'Write email content here...';
  @Input() variables: string[] | string = [];

  @Output() valueChange = new EventEmitter<string>();

  isSourceMode = false;
  sourceHtml = '';
  showVarDropdown = false;
  currentColor = '#1e293b';
  currentBgColor = '#ffffff';

  private lastSelectionRange: Range | null = null;
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  get parsedVariables(): string[] {
    if (Array.isArray(this.variables)) {
      return this.variables;
    }
    if (typeof this.variables === 'string') {
      return this.variables
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);
    }
    return [];
  }

  ngOnInit(): void {
    this.updateDomContent(this.value);
    // Listen to global click to dismiss variable dropdown
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.rte-var-dropdown-wrapper')) {
        this.showVarDropdown = false;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      const newVal = changes['value'].currentValue || '';
      if (this.editorContent && this.editorContent.nativeElement.innerHTML !== newVal) {
        this.updateDomContent(newVal);
      }
    }
  }

  // ControlValueAccessor
  writeValue(obj: any): void {
    const val = obj || '';
    this.value = val;
    this.sourceHtml = val;
    this.updateDomContent(val);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    if (this.editorContent) {
      this.editorContent.nativeElement.contentEditable = (!isDisabled).toString();
    }
  }

  private updateDomContent(html: string): void {
    if (this.editorContent) {
      this.editorContent.nativeElement.innerHTML = html;
      this.sourceHtml = html;
    }
  }

  exec(command: string, val: string | null = null): void {
    this.saveSelection();
    document.execCommand(command, false, val ?? undefined);
    this.onContentInput();
  }

  formatBlock(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const tag = select.value;
    this.exec('formatBlock', `<${tag}>`);
  }

  changeColor(event: Event, command: 'foreColor' | 'hiliteColor'): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    if (command === 'foreColor') {
      this.currentColor = color;
    } else {
      this.currentBgColor = color;
    }
    this.exec(command, color);
  }

  insertHorizontalRule(): void {
    this.exec('insertHorizontalRule');
  }

  createLink(): void {
    const url = prompt('Enter hyperlink URL (e.g. https://example.com):', 'https://');
    if (url) {
      this.exec('createLink', url);
    }
  }

  toggleVarDropdown(): void {
    this.saveSelection();
    this.showVarDropdown = !this.showVarDropdown;
  }

  insertVariable(variableName: string): void {
    const formattedVar = variableName.startsWith('{{') ? variableName : `{{${variableName}}}`;
    this.restoreSelection();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(formattedVar);
      range.insertNode(textNode);
      // Move caret after inserted node
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: append
      this.editorContent.nativeElement.innerHTML += formattedVar;
    }

    this.showVarDropdown = false;
    this.onContentInput();
  }

  toggleSourceMode(): void {
    if (!this.isSourceMode) {
      // Switching to Source Mode
      this.sourceHtml = this.editorContent.nativeElement.innerHTML;
      this.isSourceMode = true;
    } else {
      // Switching to Visual View
      this.updateDomContent(this.sourceHtml);
      this.isSourceMode = false;
      this.emitChange(this.sourceHtml);
    }
  }

  onContentInput(): void {
    const html = this.editorContent.nativeElement.innerHTML;
    this.sourceHtml = html;
    this.emitChange(html);
  }

  onSourceCodeChange(newHtml: string): void {
    this.emitChange(newHtml);
  }

  onFocus(): void {
    this.saveSelection();
  }

  onBlur(): void {
    this.saveSelection();
    this.onTouched();
  }

  private emitChange(val: string): void {
    this.value = val;
    this.valueChange.emit(val);
    this.onChange(val);
  }

  private saveSelection(): void {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      this.lastSelectionRange = sel.getRangeAt(0).cloneRange();
    }
  }

  private restoreSelection(): void {
    const sel = window.getSelection();
    if (sel && this.lastSelectionRange) {
      sel.removeAllRanges();
      sel.addRange(this.lastSelectionRange);
    } else if (this.editorContent) {
      this.editorContent.nativeElement.focus();
    }
  }
}
