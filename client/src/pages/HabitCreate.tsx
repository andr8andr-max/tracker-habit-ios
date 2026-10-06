import { useNavigate } from 'react-router-dom';
import { HabitForm } from '../components/habit/HabitForm';
import { PageHeader } from '../components/ui/PageHeader';
import { useHabits } from '../store/habits';
import { useUI } from '../store/ui';

export default function HabitCreate() {
  const createHabit = useHabits((state) => state.createHabit);
  const toast = useUI((state) => state.toast);
  const navigate = useNavigate();

  return (
    <div className="lg:max-w-[calc((200%_-_20px)/3)]">
      <PageHeader
        title="Новая привычка"
        subtitle="Опишите, что хотите отслеживать и как часто"
        backTo="/habits"
        backLabel="К списку привычек"
      />
      <div className="card">
        <HabitForm
          submitLabel="Создать привычку"
          onCancel={() => navigate('/habits')}
          onSubmit={async (input) => {
            const habit = await createHabit(input);
            toast('success', 'Привычка создана');
            navigate(`/habits/${habit.id}`, { replace: true });
          }}
        />
      </div>
    </div>
  );
}
