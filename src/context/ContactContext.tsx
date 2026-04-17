import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Contact, CONTACT_COLORS } from '@/types/contact';
import { uuid } from '@/lib/utils';

const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    displayName: 'JAY KIM',
    firstName: 'Jay',
    lastName: 'Kim',
    company: 'HLJ Chemical',
    jobTitle: 'General Manager',
    email: 'general@hljchemical.com.vn',
    phone: '+84 909 123 456',
    color: '#8B5CF6',
    createdAt: new Date('2024-04-01').toISOString(),
    linkedEventIds: ['e1'],
    linkedTaskIds: ['t1', 't2'],
    linkedNoteIds: [],
    starred: false,
    tags: ['chemical', 'vietnam'],
  },
  {
    id: '2',
    displayName: 'Lee Jae Hyun',
    firstName: 'Jae Hyun',
    lastName: 'Lee',
    company: 'Shinhan Bank',
    jobTitle: 'Senior Analyst',
    email: 'jhlee92@shinhan.com',
    phone: '+82 10 9876 5432',
    color: '#3B82F6',
    createdAt: new Date('2024-03-15').toISOString(),
    linkedEventIds: [],
    linkedTaskIds: ['t3'],
    linkedNoteIds: [],
    starred: true,
    tags: ['banking', 'korea'],
  },
  {
    id: '3',
    displayName: 'Test Contact',
    firstName: 'Test',
    lastName: 'Contact',
    email: 'test@test.com',
    color: '#10B981',
    createdAt: new Date().toISOString(),
    linkedEventIds: [],
    linkedTaskIds: [],
    linkedNoteIds: [],
    starred: false,
    tags: [],
  },
];

interface ContactContextType {
  contacts: Contact[];
  addContact: (data: Omit<Contact, 'id' | 'createdAt'>) => Contact;
  updateContact: (id: string, data: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  toggleStar: (id: string) => void;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

export const useContactContext = () => {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error('useContactContext must be used within ContactProvider');
  return ctx;
};

export const ContactProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);

  const addContact = (data: Omit<Contact, 'id' | 'createdAt'>) => {
    const newContact: Contact = {
      ...data,
      id: uuid(),
      createdAt: new Date().toISOString(),
      color: data.color || CONTACT_COLORS[contacts.length % CONTACT_COLORS.length],
    };
    setContacts(prev => [newContact, ...prev]);
    return newContact;
  };

  const updateContact = (id: string, data: Partial<Contact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const toggleStar = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, starred: !c.starred } : c));
  };

  return (
    <ContactContext.Provider value={{ contacts, addContact, updateContact, deleteContact, toggleStar }}>
      {children}
    </ContactContext.Provider>
  );
};
