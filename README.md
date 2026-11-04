# Стройконтроль: мини-CRM «Объекты и задачи»

Постановщик ставит задачи по объектам (стройкам), исполнители берут их в работу и сдают на проверку. Каждая смена статуса попадает в историю.

**Демо:** https://construction-task-crm.netlify.app (логины и пароли переданы в сообщении с откликом)

Стек: React 19 + TypeScript + Vite, Supabase (Postgres, Auth, RLS), без UI-библиотеки. Хостинг: Netlify.

Документы:
- [EXPLANATION.md](EXPLANATION.md): как устроена система, объяснение для руководителя
- [DECISIONS.md](DECISIONS.md): решения, допущения и что не вошло

## Где живёт безопасность

Все правила доступа находятся в базе, интерфейс только прячет недоступные кнопки:

| Файл | Что внутри |
|---|---|
| [supabase/migrations/20261104000000_init.sql](supabase/migrations/20261104000000_init.sql) | таблицы, RLS-политики, права на колонки, функция `change_task_status` с матрицей переходов, триггеры |
| [supabase/migrations/20261104010000_task_author_default.sql](supabase/migrations/20261104010000_task_author_default.sql) | автор задачи по умолчанию |
| [supabase/migrations/20261104020000_hardening.sql](supabase/migrations/20261104020000_hardening.sql) | хелпер роли в закрытой схеме `private`, история переживает удаление задачи |
| [scripts/security-check.ts](scripts/security-check.ts) | 27 проверок: запрещённые действия напрямую через API и разрешённый полный цикл |

Коротко о схеме защиты:
- **RLS** на всех таблицах; анонимный пользователь не получает ничего.
- **Статус нельзя изменить обычным UPDATE**: у роли `authenticated` есть право на UPDATE только для колонок `title`, `description`, `object_id`, `assignee_id`. Статус меняется только функцией `change_task_status`, которая проверяет, кто вызывает и разрешён ли переход, и в той же транзакции пишет историю.
- **История только для чтения**: на `task_status_history` нет прав INSERT/UPDATE/DELETE; записи создают только функция смены статуса и триггер создания задачи.
- **Роль** хранится в таблице `profiles`, которую пользователь не может менять (а не в `user_metadata`, который клиент редактирует сам).
- **Автор, статус «Новая» и дата создания** выставляет триггер, значения от клиента игнорируются.
- Регистрация выключена (`enable_signup = false` в [supabase/config.toml](supabase/config.toml)). Во фронтенд попадает только публичный ключ (publishable), секретный ключ не используется нигде.

## Запуск локально

Нужны Node.js 22+ и проект в Supabase (бесплатного тарифа достаточно).

```bash
npm install
cp .env.example .env          # вписать URL проекта, publishable key и пароли тестовых пользователей
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push          # применить миграции
npx supabase config push      # выключить открытую регистрацию
```

Тестовые пользователи создаются вручную: Supabase → Authentication → Users → Add user (Auto Confirm) с email из `.env`. Затем:

```bash
npx supabase db query --linked -f supabase/seed.sql   # роли и имена (или вставить файл в SQL Editor)
npm run seed                                          # объекты и задачи в разных статусах через API
npm run dev                                           # http://localhost:5173
```

## Проверки

```bash
npm run security-check   # под исполнителем, постановщиком и анонимом пробует обойти правила; выводит PASS/FAIL
npm run build            # typecheck + сборка
npm run lint
```

## Деплой (Netlify)

Репозиторий подключён к Netlify, настройки сборки в [netlify.toml](netlify.toml). В переменных окружения сайта заданы `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (публичный ключ).

## Структура

```
src/
  lib/          клиент Supabase, сгенерированные типы БД, auth-контекст, статусы и доступные действия
  components/   оболочка, таблица задач, формы, модалки
  pages/        Вход, Объекты, Карточка объекта, Карточка задачи, Мои задачи, Все задачи
supabase/       миграции, seed профилей, config.toml
scripts/        seed демо-данных и проверка безопасности
```
