import 'reflect-metadata';
import './pg-types';

import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { addDays, isScheduledOn, resolveTz, todayInTz } from '../common/utils/dates';
import { Token } from '../auth/token.entity';
import { Club } from '../clubs/club.entity';
import { Contact, ContactTag } from '../contacts/contact.entity';
import { ContactLog } from '../contacts/contact-log.entity';
import { Habit, HabitSchedule } from '../habits/habit.entity';
import { HabitLog, HabitLogStatus } from '../habits/habit-log.entity';
import { User } from '../users/user.entity';
import { buildDatabaseUrl } from './datasource-options';

const ownerEmail = process.env.SEED_OWNER_EMAIL || 'owner@club.local';
const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'owner12345';
const employeePassword = process.env.SEED_EMPLOYEE_PASSWORD || 'employee12345';

interface HabitPlan {
  owner: 'owner' | 'emp1' | 'emp2';
  title: string;
  description: string;
  targetCount: number;
  days: number[];
  remindAt: string | null;
}

interface ContactPlan {
  owner: 'owner' | 'emp1';
  name: string;
  phone: string;
  company: string;
  city: string;
  tag: ContactTag;
  note: string | null;
}

const habitPlans: HabitPlan[] = [
  { owner: 'owner', title: 'Медитация', description: 'Утренняя медитация 10 минут', targetCount: 1, days: [], remindAt: '08:00' },
  { owner: 'owner', title: 'Спортзал', description: 'Тренировка в зале', targetCount: 1, days: [1, 3, 5], remindAt: '19:00' },
  { owner: 'owner', title: 'Чтение', description: '20 страниц книги', targetCount: 1, days: [], remindAt: '22:00' },
  { owner: 'owner', title: 'Пить воду', description: '8 стаканов воды в день', targetCount: 8, days: [], remindAt: '12:00' },
  { owner: 'emp1', title: 'Утренняя пробежка', description: 'Бег 3 км', targetCount: 1, days: [1, 2, 3, 4, 5], remindAt: '07:30' },
  { owner: 'emp1', title: 'Планирование дня', description: 'Составить список задач', targetCount: 1, days: [], remindAt: '09:30' },
  { owner: 'emp1', title: 'Английский язык', description: '30 минут практики', targetCount: 1, days: [], remindAt: '21:00' },
  { owner: 'emp2', title: 'Зарядка', description: 'Комплекс упражнений', targetCount: 1, days: [], remindAt: '07:00' },
  { owner: 'emp2', title: 'Книга по бизнесу', description: 'Глава за день', targetCount: 1, days: [1, 3, 5], remindAt: '20:30' },
  { owner: 'emp2', title: 'Журнал успехов', description: 'Итоги недели', targetCount: 1, days: [0], remindAt: '18:00' },
];

const contactPlans: ContactPlan[] = [
  { owner: 'owner', name: 'Анна Смирнова', phone: '+79031112233', company: 'Смарт Логистик', city: 'Москва', tag: 'vip', note: 'Крупный клиент, тендер в декабре' },
  { owner: 'owner', name: 'Игорь Петров', phone: '+79031112244', company: 'Петров и Ко', city: 'Санкт-Петербург', tag: 'partner', note: 'Партнёрский проект' },
  { owner: 'owner', name: 'Светлана Ким', phone: '+79031112255', company: 'Ким Дизайн', city: 'Казань', tag: 'client', note: null },
  { owner: 'owner', name: 'Роман Орлов', phone: '+79031112266', company: 'Орлов Групп', city: 'Москва', tag: 'vip', note: 'Просит скидку' },
  { owner: 'owner', name: 'Дарья Соколова', phone: '+79031112277', company: 'Соколова Медиа', city: 'Новосибирск', tag: 'inactive', note: 'Давно не выходил на связь' },
  { owner: 'emp1', name: 'Максим Лебедев', phone: '+79031112288', company: 'Лебедев Сервис', city: 'Москва', tag: 'client', note: null },
  { owner: 'emp1', name: 'Юлия Новикова', phone: '+79031112299', company: 'Новикова Ритейл', city: 'Екатеринбург', tag: 'partner', note: 'Хочет демо' },
  { owner: 'emp1', name: 'Тимур Хайруллин', phone: '+79031112300', company: 'Хайруллин Строй', city: 'Казань', tag: 'client', note: null },
];

function logStatusFor(planIndex: number, dayIndex: number): HabitLogStatus | null {
  const value = (planIndex * 31 + dayIndex * 17 + 7) % 10;
  if (value < 7) return 'done';
  if (value === 7 || value === 8) return 'skipped';
  return null;
}

async function main(): Promise<void> {
  const ds = await new DataSource({
    type: 'postgres',
    url: buildDatabaseUrl(),
    entities: [User, Club, Habit, HabitLog, Contact, ContactLog, Token],
    synchronize: String(process.env.TYPEORM_SYNC ?? 'true') !== 'false',
    logging: false,
  }).initialize();

  try {
    const usersRepo = ds.getRepository(User);
    const clubsRepo = ds.getRepository(Club);
    const habitsRepo = ds.getRepository(Habit);
    const habitLogsRepo = ds.getRepository(HabitLog);
    const contactsRepo = ds.getRepository(Contact);
    const contactLogsRepo = ds.getRepository(ContactLog);

    const ownerHash = await bcrypt.hash(ownerPassword, 10);
    const employeeHash = await bcrypt.hash(employeePassword, 10);

    let owner = await usersRepo.findOne({ where: { email: ownerEmail } });
    if (!owner) {
      owner = await usersRepo.save(
        usersRepo.create({
          email: ownerEmail,
          passwordHash: ownerHash,
          name: 'Владелец клуба',
          phone: '+79000000000',
          role: 'owner',
          clubId: null,
          avatarUrl: null,
        }),
      );
    } else {
      owner.passwordHash = ownerHash;
      owner.name = 'Владелец клуба';
      owner.role = 'owner';
      owner = await usersRepo.save(owner);
    }

    let club = await clubsRepo.findOne({ where: [{ ownerId: owner.id }, { name: 'Клуб предпринимателей' }] });
    if (!club) {
      club = await clubsRepo.save(
        clubsRepo.create({ name: 'Клуб предпринимателей', ownerId: owner.id, logoUrl: null, address: null }),
      );
    } else {
      club.name = 'Клуб предпринимателей';
      club.ownerId = owner.id;
      club = await clubsRepo.save(club);
    }
    if (owner.clubId !== club.id) {
      owner.clubId = club.id;
      owner = await usersRepo.save(owner);
    }

    const employeeData = [
      { email: 'employee1@club.local', name: 'Мария Орлова', phone: '+79000000001' },
      { email: 'employee2@club.local', name: 'Павел Ковалёв', phone: '+79000000002' },
    ];
    const employees: Record<string, User> = {};
    for (const data of employeeData) {
      let employee = await usersRepo.findOne({ where: { email: data.email } });
      if (!employee) {
        employee = await usersRepo.save(
          usersRepo.create({
            email: data.email,
            passwordHash: employeeHash,
            name: data.name,
            phone: data.phone,
            role: 'employee',
            clubId: club.id,
            avatarUrl: null,
          }),
        );
      } else {
        employee.passwordHash = employeeHash;
        employee.name = data.name;
        employee.role = 'employee';
        employee.clubId = club.id;
        employee = await usersRepo.save(employee);
      }
      employees[data.email === 'employee1@club.local' ? 'emp1' : 'emp2'] = employee;
    }

    const ownersMap: Record<HabitPlan['owner'], User> = { owner, emp1: employees.emp1, emp2: employees.emp2 };
    const today = todayInTz(resolveTz());

    let habitsCreated = 0;
    let habitLogsCreated = 0;
    const habitIdByKey = new Map<string, string>();

    for (const [index, plan] of habitPlans.entries()) {
      const planUser = ownersMap[plan.owner];
      const schedule: HabitSchedule = { days: plan.days };
      let habit = await habitsRepo.findOne({ where: { userId: planUser.id, title: plan.title } });
      if (!habit) {
        habit = await habitsRepo.save(
          habitsRepo.create({
            userId: planUser.id,
            title: plan.title,
            description: plan.description,
            targetCount: plan.targetCount,
            schedule,
            notificationsEnabled: true,
            remindAt: plan.remindAt,
          }),
        );
        habitsCreated += 1;
      }
      habitIdByKey.set(`${plan.owner}:${plan.title}`, habit.id);

      for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
        const date = addDays(today, -dayIndex);
        if (!isScheduledOn(schedule, date)) continue;
        const status = logStatusFor(index, dayIndex);
        if (!status) continue;
        const existing = await habitLogsRepo.findOne({ where: { habitId: habit.id, date } });
        if (existing) continue;
        await habitLogsRepo.save(
          habitLogsRepo.create({ habitId: habit.id, date, status, note: null }),
        );
        habitLogsCreated += 1;
      }
    }

    const emp1 = employees.emp1;

    let contactsCreated = 0;
    let contactLogsCreated = 0;

    for (const [index, plan] of contactPlans.entries()) {
      const contactUser = ownersMap[plan.owner];
      let contact = await contactsRepo.findOne({ where: { userId: contactUser.id, name: plan.name } });
      if (!contact) {
        contact = await contactsRepo.save(
          contactsRepo.create({
            userId: contactUser.id,
            name: plan.name,
            phone: plan.phone,
            company: plan.company,
            city: plan.city,
            tag: plan.tag,
            note: plan.note,
            linkedEmployeeId: plan.owner === 'owner' ? emp1.id : null,
          }),
        );
        contactsCreated += 1;
      }

      const existingLogs = await contactLogsRepo.count({ where: { contactId: contact.id } });
      if (existingLogs > 0) continue;

      const actions = ['звонок', 'встреча'];
      const durations = [15, 30];
      for (let logIndex = 0; logIndex < 2; logIndex++) {
        await contactLogsRepo.save(
          contactLogsRepo.create({
            contactId: contact.id,
            action: actions[(index + logIndex) % actions.length],
            durationMin: durations[(index + logIndex) % durations.length],
            comment: logIndex === 0 ? 'Обсудили детали сотрудничества' : 'Договорились о следующей встрече',
          }),
        );
        contactLogsCreated += 1;
      }
    }

    console.log('SEED OK');
    console.log(`owner: ${ownerEmail} / ${ownerPassword}`);
    console.log(`employees: employee1@club.local, employee2@club.local / ${employeePassword}`);
    console.log(
      `club: ${club.name}; habits created: ${habitsCreated}, habit logs created: ${habitLogsCreated}, contacts created: ${contactsCreated}, contact logs created: ${contactLogsCreated}`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch(error => {
  console.error('SEED FAILED:', error);
  process.exit(1);
});
