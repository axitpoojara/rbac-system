export interface EmailTemplate {
  id: string;
  templateKey: string;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  availableVariables: string;
  isActive: boolean;
  isSystemTemplate: boolean;
  createdAtUtc: string;
  createdBy?: string;
  updatedAtUtc?: string;
  updatedBy?: string;
}

export interface CreateEmailTemplateDto {
  templateKey: string;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  availableVariables: string;
  isActive: boolean;
}

export interface UpdateEmailTemplateDto {
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  availableVariables: string;
  isActive: boolean;
}

export interface SendTestEmailRequest {
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
  sampleData?: Record<string, string>;
}
