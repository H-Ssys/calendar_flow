import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Contact, CONTACT_COLORS } from '@/types/contact';
import { supabase } from '@ofative/supabase-client';
import { useAuthContext } from '@/context/AuthContext';
import {
  mapV2ToV1,
  mapV1ToV2Insert,
  mapV1UpdateToV2,
  type ContactRowLoose,
} from '@/utils/contactTypeMapper';

// Queries target `active_contacts` view (WHERE deleted_at IS NULL); see
// docs/vault/02-features/namecard-ocr/contract.md §"DB constraints".

interface ContactContextType {
  contacts: Contact[];
  addContact: (data: Omit<Contact, 'id' | 'createdAt'>) => Promise<Contact>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  addContactReference: (contactId: string, refId: string, label?: string) => Promise<void>;
  removeContactReference: (contactId: string, refId: string) => Promise<void>;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

export const useContactContext = () => {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error('useContactContext must be used within ContactProvider');
  return ctx;
};

export const ContactProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { user } = useAuthContext();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('active_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[ContactContext] fetch failed:', error);
          return;
        }
        if (data) {
          setContacts((data as unknown as ContactRowLoose[]).map(mapV2ToV1));
        }
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const addContact = async (data: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact> => {
    if (!user?.id) throw new Error('Not authenticated');
    const fallbackColor = data.color || CONTACT_COLORS[contacts.length % CONTACT_COLORS.length];
    const insertPayload = mapV1ToV2Insert({ ...data, color: fallbackColor }, user.id);
    const { data: row, error } = await supabase
      .from('contacts')
      .insert(insertPayload as never)
      .select()
      .single();
    if (error) throw error;
    const v1 = mapV2ToV1(row as unknown as ContactRowLoose);
    setContacts(prev => [v1, ...prev]);
    return v1;
  };

  const updateContact = async (id: string, data: Partial<Contact>): Promise<void> => {
    if (!user?.id) return;
    const patch = mapV1UpdateToV2(data);
    if (Object.keys(patch).length === 0) return;
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    const { error } = await supabase
      .from('contacts')
      .update(patch as never)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      console.error('[ContactContext] update failed:', error);
      throw error;
    }
  };

  const deleteContact = async (id: string): Promise<void> => {
    if (!user?.id) return;
    setContacts(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) console.error('[ContactContext] soft delete failed:', error);
  };

  const toggleStar = async (id: string): Promise<void> => {
    const current = contacts.find(c => c.id === id);
    if (!current || !user?.id) return;
    const next = !current.starred;
    setContacts(prev => prev.map(c => c.id === id ? { ...c, starred: next } : c));
    const { error } = await supabase
      .from('contacts')
      .update({ is_favorite: next } as never)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) console.error('[ContactContext] toggleStar failed:', error);
  };

  // Symmetric pair storage: always sort IDs so source_contact_id < target_contact_id.
  // See contract.md §"DB constraints" (3) and migration 013's CHECK constraint.
  const addContactReference = async (
    contactId: string,
    refId: string,
    label?: string,
  ): Promise<void> => {
    if (!user) return;
    const [src, tgt] = [contactId, refId].sort();
    await supabase.from('contact_references').insert({
      source_contact_id: src,
      target_contact_id: tgt,
      reference_label: label ?? null,
    } as never);
  };

  const removeContactReference = async (
    contactId: string,
    refId: string,
  ): Promise<void> => {
    if (!user) return;
    const [src, tgt] = [contactId, refId].sort();
    await supabase
      .from('contact_references')
      .delete()
      .eq('source_contact_id', src)
      .eq('target_contact_id', tgt);
  };

  return (
    <ContactContext.Provider
      value={{
        contacts,
        addContact,
        updateContact,
        deleteContact,
        toggleStar,
        addContactReference,
        removeContactReference,
      }}
    >
      {children}
    </ContactContext.Provider>
  );
};
