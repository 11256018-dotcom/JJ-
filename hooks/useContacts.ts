import { useCallback, useState } from 'react';
import { CONTACTS } from '../data/data';
import { Contact } from '../utils/types';

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>(CONTACTS);

  const getContactById = useCallback(
    (id: string): Contact | undefined => {
      return contacts.find((contact) => contact.id === id);
    },
    [contacts]
  );

  const updateContact = useCallback((updatedContact: Contact) => {
    setContacts((prevContacts) =>
      prevContacts.map((contact) =>
        contact.id === updatedContact.id ? updatedContact : contact
      )
    );
  }, []);

  return { contacts, getContactById, updateContact };
};
