import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContactForm } from '../components/contact/ContactForm';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore } from '../store/auth';
import { useContacts } from '../store/contacts';
import { useProfile } from '../store/profile';
import { useUI } from '../store/ui';

export default function ContactCreate() {
  const createContact = useContacts((state) => state.createContact);
  const user = useAuthStore((state) => state.user);
  const employees = useProfile((state) => state.employees);
  const fetchEmployees = useProfile((state) => state.fetchEmployees);
  const toast = useUI((state) => state.toast);
  const navigate = useNavigate();

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (isOwner && employees.length === 0) {
      void fetchEmployees();
    }
  }, [isOwner, employees.length, fetchEmployees]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Новый контакт"
        subtitle="Карточка человека или компании клуба"
        backTo="/contacts"
        backLabel="К списку контактов"
      />
      <div className="card">
        <ContactForm
          submitLabel="Создать контакт"
          showLinkField={isOwner}
          employees={employees}
          onCancel={() => navigate('/contacts')}
          onSubmit={async (input) => {
            const contact = await createContact(input);
            toast('success', 'Контакт создан');
            navigate(`/contacts/${contact.id}`, { replace: true });
          }}
        />
      </div>
    </div>
  );
}
