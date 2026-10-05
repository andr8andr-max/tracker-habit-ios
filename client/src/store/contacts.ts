import { create } from 'zustand';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api/client';
import type {
  Contact,
  ContactDetailPayload,
  ContactLog,
  ContactTag,
} from '../api/types';

export interface ContactQuery {
  q?: string;
  tag?: ContactTag | '';
  sort?: 'alpha' | 'last';
}

export interface ContactInput {
  name: string;
  phone: string | null;
  company: string | null;
  city: string | null;
  tag: ContactTag;
  note: string | null;
  linkedEmployeeId?: string | null;
}

export interface ContactLogInput {
  action: string;
  durationMin?: number | null;
  comment?: string | null;
}

interface ContactsState {
  items: Contact[];
  loading: boolean;
  loaded: boolean;
  detail: Contact | null;
  logs: ContactLog[];
  detailLoading: boolean;
  fetchContacts: (query?: ContactQuery) => Promise<void>;
  fetchContact: (id: string) => Promise<void>;
  clearDetail: () => void;
  createContact: (input: ContactInput) => Promise<Contact>;
  updateContact: (id: string, input: Partial<ContactInput>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  addContactLog: (id: string, input: ContactLogInput) => Promise<void>;
}

export const useContacts = create<ContactsState>((set) => ({
  items: [],
  loading: false,
  loaded: false,
  detail: null,
  logs: [],
  detailLoading: false,
  fetchContacts: async (query) => {
    set({ loading: true });
    try {
      const items = await apiGet<Contact[]>('/contacts', {
        query: {
          q: query?.q,
          tag: query?.tag,
          sort: query?.sort,
        },
      });
      set({ items, loaded: true });
    } finally {
      set({ loading: false });
    }
  },
  fetchContact: async (id) => {
    set({ detailLoading: true });
    try {
      const payload = await apiGet<ContactDetailPayload>(`/contacts/${id}`);
      set({ detail: payload.contact, logs: payload.logs ?? [] });
    } finally {
      set({ detailLoading: false });
    }
  },
  clearDetail: () => set({ detail: null, logs: [] }),
  createContact: async (input) => {
    const contact = await apiPost<Contact>('/contacts', input);
    set((state) => ({ items: [contact, ...state.items] }));
    return contact;
  },
  updateContact: async (id, input) => {
    const updated = await apiPatch<Contact>(`/contacts/${id}`, input);
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updated } : item)),
      detail: state.detail && state.detail.id === id ? { ...state.detail, ...updated } : state.detail,
    }));
  },
  deleteContact: async (id) => {
    await apiDelete(`/contacts/${id}`);
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      detail: state.detail && state.detail.id === id ? null : state.detail,
      logs: state.detail && state.detail.id === id ? [] : state.logs,
    }));
  },
  addContactLog: async (id, input) => {
    await apiPost(`/contacts/${id}/logs`, input);
    const payload = await apiGet<ContactDetailPayload>(`/contacts/${id}`);
    set({ detail: payload.contact, logs: payload.logs ?? [] });
  },
}));
