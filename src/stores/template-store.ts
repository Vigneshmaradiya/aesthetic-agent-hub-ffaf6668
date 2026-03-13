import { create } from "zustand";

export interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

interface TemplateState {
  templates: Template[];
  isLoading: boolean;

  setTemplates: (templates: Template[]) => void;
  addTemplate: (template: Template) => void;
  getTemplatesByCategory: (category: string) => Template[];
}

const sampleTemplates: Template[] = [
  {
    id: "tpl-1",
    title: "Greeting",
    content:
      "Hello! Thank you for reaching out to our support team. I'd be happy to help you with your inquiry. Could you please provide me with a bit more detail so I can assist you more effectively?",
    category: "General",
    tags: ["greeting", "welcome", "intro"],
  },
  {
    id: "tpl-2",
    title: "Password Reset Steps",
    content:
      'To reset your password, please follow these steps:\n\n1. Go to the login page and click "Forgot Password"\n2. Enter the email address associated with your account\n3. Check your inbox for a password reset link (it may take a few minutes)\n4. Click the link and create a new password\n5. Log in with your new credentials\n\nIf you don\'t receive the email, please check your spam folder.',
    category: "Account",
    tags: ["password", "reset", "login", "authentication"],
  },
  {
    id: "tpl-3",
    title: "Escalation Notice",
    content:
      "I understand this issue requires additional expertise. I'm escalating your ticket to our specialized team who will be able to assist you further. You should hear back from them within 24 hours. Your reference number remains the same, and I'll add detailed notes to ensure a smooth handoff.",
    category: "Process",
    tags: ["escalation", "transfer", "handoff", "priority"],
  },
  {
    id: "tpl-4",
    title: "Billing Inquiry Response",
    content:
      "Thank you for your billing inquiry. I've reviewed your account and here's what I found:\n\n- Current plan: [PLAN_NAME]\n- Billing cycle: [CYCLE]\n- Next invoice date: [DATE]\n\nPlease let me know if you have any additional questions about your billing or if you'd like to make any changes to your subscription.",
    category: "Billing",
    tags: ["billing", "invoice", "payment", "subscription"],
  },
  {
    id: "tpl-5",
    title: "Bug Report Acknowledgment",
    content:
      "Thank you for reporting this issue. I've documented the bug and forwarded it to our engineering team for investigation. Here's what I've logged:\n\n- Issue: [DESCRIPTION]\n- Steps to reproduce: [STEPS]\n- Expected behavior: [EXPECTED]\n\nWe'll keep you updated on the progress. In the meantime, here's a workaround you can try: [WORKAROUND].",
    category: "Technical",
    tags: ["bug", "report", "technical", "engineering"],
  },
  {
    id: "tpl-6",
    title: "Closing - Resolved",
    content:
      "I'm glad we were able to resolve your issue! If you have any other questions or run into any problems in the future, don't hesitate to reach out. We're always here to help. Have a great day!",
    category: "General",
    tags: ["closing", "resolved", "goodbye", "satisfaction"],
  },
];

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: sampleTemplates,
  isLoading: false,

  setTemplates: (templates) => set({ templates }),

  addTemplate: (template) =>
    set((state) => ({
      templates: [...state.templates, template],
    })),

  getTemplatesByCategory: (category) => {
    const { templates } = get();
    return templates.filter(
      (t) => t.category.toLowerCase() === category.toLowerCase(),
    );
  },
}));
