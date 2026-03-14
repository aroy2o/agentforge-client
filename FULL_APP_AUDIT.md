# SECTION A — APP OVERVIEW

AgentForge is a multi-agent productivity application that lets a user assemble a small team of specialized AI agents, give them a mission, run them in sequence, and review the result as a single coordinated workflow. It is built for people who want more structure than a single chatbot response, especially when a task benefits from research, summarization, calculation, planning, drafting, scheduling, or delivery.

The app solves the problem of turning vague requests into repeatable multi-step AI workflows. Instead of asking one model to do everything at once, the user can choose or build role-based agents, arrange them into a pipeline, attach supporting inputs such as a PDF or a currency conversion request, and then let each agent contribute one stage of the final outcome.

The primary users are knowledge workers, researchers, founders, operators, students, and anyone who needs repeatable AI-assisted workflows with some memory, delivery, scheduling, and auditability. The core value proposition is that the app combines orchestration, persistent history, scheduling, voice interaction, translation, and export in one place while still allowing the user to control which agents participate.

On the frontend, the application is a React single-page app using React Router for navigation and Redux Toolkit for state management. The interface is organized around a dashboard workflow, a combined authentication screen, an agent builder, a scheduler, a chat workspace, a settings area, and a results archive, with shared layout components for the header, sidebar, calendar panel, and floating voice controls.

On the backend, the application is an Express server with route modules for agents, authentication, chat, tools, voice, user data, notifications, permissions, integrations, and export. The server coordinates agent execution through Ollama, handles text-to-speech through ElevenLabs with browser fallback, supports Google Calendar integration through OAuth, sends email with Nodemailer, performs translation through a local translation service, stores vector memory with Chroma, and persists user and workflow data in MongoDB through Mongoose models.

# SECTION B — EVERY PAGE AND WHAT IT DOES

## Login

The current app uses a single authentication page with a login mode, so the Login experience is one state of the shared Auth screen. The screen shows the AgentForge wordmark, a subtitle, a mode switcher, an email field, a password field with a show or hide toggle, a submit button, and a small link that switches to registration mode.

- The user can type an email address into the email field, and the page stores the value locally until submission.
- The user can type a password into the password field, and the page enforces a minimum length on the client before submission.
- The user can click the eye icon to reveal or hide the password text immediately in the input.
- The user can click the Login tab to stay in login mode, which keeps the form focused on returning users.
- The user can click the Sign In button, which sends the credentials to the backend, stores the returned token, updates authenticated Redux state, and redirects to the dashboard on success.
- If the login fails, the page shows an inline error message under the form and keeps the user on the screen.
- If the app already finds a valid stored session, the page immediately redirects the authenticated user away from the auth screen and into the main app.

## Register

The Register experience is the second state of that same authentication screen and adds one extra field for the user’s name. The visible UI becomes the same login shell plus a full name field, and the primary button label changes to account creation wording.

- The user can type a full name, which is required before the account can be created.
- The user can enter an email address and password using the same shared controls as login mode.
- The user can switch between Register and Login by using either the tab row or the small text link below the form.
- The user can click Create Account, which sends the registration payload to the backend, stores the returned token, seeds default agents on the server, updates Redux auth state, and redirects to the dashboard on success.
- If registration fails because the email already exists or another server validation fails, the page shows the returned error text inline.

## Dashboard

The Dashboard is the main working area and contains the pipeline canvas, mission input card, quick task shortcuts, a live activity log panel, and an agent memory panel. Around it, the shared layout also exposes the header, sidebar, optional right-side panels on larger screens, the floating voice control panel, and modal overlays such as the agent modal and calendar drawer.

- The user can click any agent in the sidebar roster to open its detail modal.
- The user can add an agent to the pipeline from its roster card, and the pipeline canvas updates immediately.
- The user can remove an agent from the pipeline either from the roster card or directly from the pipeline node.
- The user can clear the entire pipeline from the pipeline canvas header when a run is not in progress.
- The user can type a mission in the main textarea, and Redux stores the task text live as the source of truth for execution and recommendation logic.
- If email delivery is enabled in preferences, the user can type an optional recipient email under the mission input.
- The user can attach a PDF from the task input card, and the UI shows upload state and a removable attachment chip once the file is processed into base64.
- The user can open the inline currency converter attachment controls, type amount and currency codes, preview the conversion, and keep the conversion request attached to the run.
- The image, code, data, and chart attachment controls are visibly disabled in the current build and are not available to the user as working tools.
- The user can accept a recommended pipeline banner when task text matches the detection rules, and the suggested agents are inserted into the pipeline automatically.
- The user can click any quick task chip to fill the mission input with a prewritten sample request.
- The user can click Execute Pipeline once a non-empty task and at least one pipeline step exist, and the dashboard shifts into a live run state.
- While a pipeline is running, the pipeline nodes show the active step, the header status changes to running, the activity log fills with system, tool, thought, and output entries, and attachments are summarized at the top of the log.
- When a run completes, the log can show a Continue to Chat button that opens the chat page with the finished pipeline context attached.
- The user can clear the current log stream or clear all active attachments from the action row beneath the mission input.
- In the right panel, the user can watch activity logs on top and agent memory below on desktop, while those same panels are shown as stacked cards lower on the page for smaller screens.
- The user can type into the memory search box, which performs semantic memory search across agents that have stored memory and returns grouped matches.
- The user can expand a stored memory card to reveal the full saved output, then collapse it again.
- The user can drag the vertical resize handle between the main area and the right panel on large screens to change the width of the side panel.

## Agents

There is no separate current page named Agents; the functional replacement is the Agent Builder page plus the sidebar roster and the agent modal. Together these surfaces let the user create, inspect, edit, color, equip, and remove agents.

- On the Agent Builder page, the user sees a two-step wizard, a live preview card, and fields for name, description, example tasks, role, category, personality, tools, and color.
- In step one, the user can type an agent name, describe what the agent should do, and optionally add example tasks separated by commas.
- The user can click Generate Agent, which sends the description to the backend prompt generator and fills the personality instructions field with a drafted system prompt.
- In step two, the user can edit the role title, category, generated instructions, equipped tools, and avatar color before deployment.
- The user can click Regenerate to request a new personality draft while staying in the builder flow.
- The user can click Deploy Agent, which adds the new agent to Redux and returns the user to the dashboard.
- The user can click Cancel or the Back control to leave or step backward in the flow.
- In the sidebar roster, every agent card shows the avatar letter, name, role, and tool pills, and the user can add or remove the agent from the active pipeline from that same card.
- Hovering an agent card reveals edit and delete controls, except default agents cannot be deleted.
- Clicking the edit icon opens the agent modal in edit mode, where the user can change name, role, instructions, tools, and color and then save the changes.
- Clicking the delete icon triggers a confirm state on the card, and confirming removes the non-default agent from Redux.
- Clicking an agent card opens the read-only modal view when not explicitly editing.
- In the modal’s read-only view, the user can see instructions, equipped tools, and recent memory entries for the selected agent.

## Scheduler

The Scheduler page is split into two main columns: active schedules on the left and the schedule creation form on the right. It combines schedule management, natural-language time parsing, pipeline assembly, recommendation logic, and immediate run controls.

- The Active Schedules side loads all saved schedules for the authenticated user and shows each schedule as a card with task text, lead agent, cadence, recipient, active or paused badge, next run line, run count, and optional pipeline flow.
- The user can delete a schedule from its card, and the schedule is removed from the page and deleted on the backend.
- The user can pause or resume a schedule, and the button changes to an updating state while the backend saves the new active flag.
- The user can run a schedule immediately, and the page shows a running state until the server finishes the ad hoc execution.
- The New Schedule form lets the user type a task description, build a multi-agent pipeline, enter a recipient email, choose a quick frequency preset, type a natural-language time phrase, answer clarifications, and submit the schedule.
- If pipeline recommendations are enabled and the task text is long enough, the page can show a recommendation banner that the user can accept to auto-fill the pipeline.
- The user can manually add agents to the schedule pipeline, remove them one by one, and open or close the add-agent menu.
- The user can click a frequency preset, which fills the time input and immediately triggers time parsing.
- The user can type a natural-language schedule such as a daily or alternate-day phrase, and the page shows a parsed human-readable result plus the cron expression.
- If the parser is uncertain, the page shows a clarification prompt and the user can type extra context and resubmit the combined phrasing.
- Clicking Schedule It sends the task, parsed time, recipient, and pipeline to the backend and resets the form on success.

## Chat

The Chat page is a full conversational workspace for ARIA and pipeline follow-up. It combines a left session list, a right conversation pane, agent auto-detection, streaming responses, editable session titles, follow-up suggestion chips, translation, voice playback, and pipeline reruns.

- The left sidebar shows a New Chat button, a session search field, and a list of recent chat sessions for the current user.
- The user can create a new chat, which creates a session on the backend and activates it in Redux.
- The user can search sessions by title, and the list filters immediately based on the typed query.
- Clicking a session opens it and switches the right pane into the correct chat or pipeline-history mode.
- Clicking a session delete button removes that session from the backend and the list.
- In the conversation header, the user can edit the session title and save it back to the backend.
- If the active session came from a pipeline run, the user can click Re-run Pipeline to push the saved task and pipeline back into the dashboard and start execution again.
- The message area shows user, assistant, and system messages, including pipeline summary context when a run is handed off into chat.
- If a session is empty, the page shows prompt suggestions that the user can click to populate the input box.
- The main input area is a textarea that accepts typed questions, supports Enter to send, and supports Shift and Enter for a newline.
- The page detects likely specialist agents from the typed text and shows which agent will answer before the message is sent.
- Clicking Send, or pressing Enter, streams the response from either the general ARIA chat endpoint or the selected specialist agent stream endpoint.
- While a reply streams, the UI shows a thinking indicator and the partial answer updates in place.
- The user can stop a streaming reply with the stop button.
- After an assistant answer completes, the page can show three follow-up suggestion chips that the user can click to seed the next question.
- Assistant answers are spoken aloud through the voice system when voice is enabled and not muted.

## Settings

The Settings page is a multi-tab control center with tabs for Notifications, Integrations, Profile, Preferences, Appearance, and Danger Zone. On mobile, the tabs appear as a horizontal scroll row, and on larger screens they appear as a left navigation panel.

- In Notifications, the user can toggle notifications globally, toggle email notifications specifically, change the default email address, trigger a test email, toggle which event categories send notifications, and save the notification settings.
- In Integrations, the user can connect Google Calendar through an external OAuth window or disconnect an existing Google Calendar account.
- In Profile, the user can view the stored name and email and submit a password change form.
- In Preferences, the user can toggle pipeline recommendations, the email field in task input, auto-send behavior, voice enabled by default, and automatic prompt optimisation, then save those preferences.
- In Appearance, the user can toggle between light and dark theme and open the language selector.
- In Danger Zone, the user can clear agent memory, reset agents to default, or delete the account, each behind a confirmation flow.

## Results Archive

The Results page is a mission archive that stores completed pipeline runs and their exports. It is not listed in the original prompt’s page list, but it is a live routed page in the current app and is essential to the feature set.

- If there are no completed tasks, the page shows an empty state with a button that returns to the dashboard.
- When there are archived tasks, each card shows the task title, completion time, agent color markers, completion badge, expand or collapse control, export controls, copy control, optional add-to-calendar control, and a delete button.
- Expanding a result shows the full log stream for that archived run and the raw pipeline output underneath.
- The user can export a run as Markdown or PDF using client-side export helpers.
- The user can copy the full output to the clipboard.
- If the run used the to-do feature, the user can send extracted to-do items into Google Calendar.
- The user can delete an archived task, which removes it locally and from the backend if it has already been persisted there.

# SECTION C — EVERY FEATURE IN DETAIL

## Pipeline Execution With Multiple Agents

- This is the app’s core workflow and is accessed from the dashboard by building a pipeline from the roster and clicking Execute Pipeline.
- The frontend validates that a mission exists, that at least one agent is present, and that no run is already in progress, then it opens a live execution state with logs and active-step highlighting.
- The backend does not execute a single pipeline endpoint; instead the frontend orchestrates step-by-step calls to agent and tool endpoints, builds context between steps, stores the outputs, and saves the finished task record.
- Data saved includes chat messages, completed task history, agent memory summaries, optional pipeline result context for chat handoff, and backend task persistence.
- The user sees a live terminal-style log, active pipeline highlighting, output streaming per agent, and a completion message with an option to continue in chat.

## Prompt Reframing Before Pipeline Runs

- This feature rewrites a user’s raw mission into a more structured prompt when the user preference for automatic optimisation is enabled.
- It is triggered automatically at the start of pipeline execution and also considers whether a PDF is attached and which agents are in the pipeline.
- The backend reframe endpoint returns a reframed task plus a short change summary, and the frontend logs that result as a dedicated optimisation event.
- No separate long-term document is saved for the reframe, but the optimised text is stored in pipeline results and completed tasks.
- The user sees a brief prompt-optimised preview card before the pipeline continues.

## Smart Pipeline Recommendations From Task Input

- This feature suggests a likely agent order based on keywords in the typed task text.
- It appears on both the dashboard mission input and the scheduler page when recommendations are enabled and the existing pipeline is still empty.
- The detection logic runs locally on the client using keyword rules tied to the current agent roster.
- No backend data is saved until the user actually accepts the recommendation or runs the workflow.
- The user sees a banner with a suggested label and agent sequence and can accept it with one click.

## Agent Creation And Customisation

- This feature lets the user define a new agent and is accessed through the builder route, the sidebar create button, or a voice command that opens the builder.
- The user first describes the agent, then requests a generated instruction set, then edits tools, role, category, personality, and color before deployment.
- The backend prompt generator creates the initial personality draft, while final deployment is currently client-first and stores the new agent in Redux and later sync logic.
- The app saves agent identity, role, tools, personality, color, default status, and creation time, and later may sync the agent to the user record on the backend.
- The user sees a two-step wizard with a live preview card and success feedback when the agent is deployed.

## Tool Equipping On Agents

- This feature controls which capabilities an agent advertises and is available during agent creation and agent editing.
- The user selects or deselects tool pills in the builder or in the agent modal edit state.
- The selected tools influence pipeline behavior, specialist routing, tool invocation logs, and agent card display.
- Tool selections are stored on the agent record and read back into the sidebar, modal, and execution logic.
- The user sees the equipped tools as colored pills on agent cards and in the modal.

## PDF Reader Tool

- This is the main active attachment tool besides currency conversion and is accessed from the dashboard task input.
- The user attaches a PDF, the frontend converts it into base64, the backend extracts text from the document, and the extracted text is injected into agent context before the run proceeds.
- The backend saves no standalone PDF document record, but the run stores the optimised task, logs, and final outputs that used the document.
- The user sees PDF processing state, a ready attachment chip, and then pipeline outputs grounded in the attached document.

## Currency Converter Tool

- This feature supports lightweight conversion tasks and is accessed from the dashboard task input attachment row.
- The user enters an amount and two currency codes, optionally previews the rate, and then runs a pipeline where any qualifying agent can use the conversion result.
- The backend fetches live exchange data, caches rates for a limited period, and returns converted values plus the applied rate.
- The conversion request is stored in task attachment state and may be reflected in logs and final output.
- The user sees a preview string before execution and a currency attachment chip while the request is attached.

## Schedule Creation And Management

- This feature lets users automate recurring or immediate delivery workflows from the Scheduler page.
- The user builds a schedule form, selects a pipeline, chooses timing, enters a recipient, submits the schedule, and later can pause, resume, delete, or run that schedule immediately.
- The backend saves the schedule, registers or unregisters cron jobs, optionally executes immediate runs, updates run counts, and can send confirmation or delivery emails.
- Data saved includes schedule definition, pipeline steps, cron expression, recipient details, active state, next run, run count, and schedule history.
- The user sees schedule cards, status badges, next-run text, pipeline flow previews, and toast confirmations.

## Cron Time Parsing With Natural Language

- This feature converts plain-English schedule phrases into a cron expression and is embedded in the scheduler form.
- The frontend sends the typed phrase after a short debounce, and the backend first attempts local parsing before falling back to the language model for more complex phrasing.
- The parsed cron string, human-readable phrase, confidence score, clarification question, and next run time are returned to the page.
- This data is not permanently saved unless the user actually submits the schedule.
- The user sees either a successful parsed schedule, an ambiguity prompt, or an error message asking for clearer phrasing.

## Chat Sessions And Message History

- This feature provides persistent conversational history for both freeform chat and pipeline follow-up.
- The user starts a session, sends messages, receives streamed replies, renames the session, deletes it, or returns to any saved session later.
- The backend stores session metadata, messages, optional pipeline context, and timestamps, and the frontend mirrors the active session in Redux.
- Data saved includes title, task goal, pipeline agents, message content, tools used, timestamps, and updated time.
- The user sees a searchable session list, an active conversation pane, and pipeline summary messages when a workflow is handed off into chat.

## Voice Control Panel

- This feature is the floating voice interface present across the app layout.
- The user can enable or disable voice, start or stop listening, mute or unmute spoken playback, toggle continuous listening, type a command instead of speaking, expand conversation history, and submit natural-language commands.
- The backend parses commands through the voice parser and serves speech audio through ElevenLabs when available.
- Data saved in Redux includes voice-enabled state, listening state, speaking state, mute state, parser result, active voice engine, and a short rolling conversation history.
- The user sees animated listening, speaking, and processing states plus the latest voice exchange history in an expandable panel.

## Notifications And Email Sending

- This feature handles notification preferences, test email sending, pipeline result delivery, scheduled delivery, and recipient permission requests.
- The user configures notification settings in Settings, may set a default address, and can trigger test emails or rely on delivery events from the pipeline and scheduler.
- The backend stores notification preferences on the user record, sends email through SMTP, and creates permission-request records when a message targets an address different from the user’s default approved address.
- Data saved includes notification preferences and permission-request tokens with approval status and expiry.
- The user sees toggles, save confirmations, test-email feedback, delivery notices, or permission request flows outside the app through emailed accept and decline links.

## Google Calendar Integration

- This feature connects the app to Google Calendar and is accessed from the header, settings integration tab, the calendar drawer, the results archive add-to-calendar action, and task planning flows.
- The user launches OAuth, authorizes the account, then can fetch upcoming events, open the side calendar panel, create calendar entries from to-do lists, and disconnect the integration later.
- The backend manages OAuth state, token exchange, token storage on the user document, event creation, and event retrieval for the next seven days.
- Data saved includes refresh token, access token, token expiry, connected flag, and associated account email on the user model.
- The user sees connection state in the header and settings, event cards in the calendar drawer, and links that open events in Google Calendar.

## Export Features

- This feature exists on the Results Archive page and supports Markdown export, PDF export, and clipboard copy.
- The user opens an archived task and can export the run content in either format or copy the output directly.
- Markdown and PDF export are currently handled on the client, while the backend also exposes export endpoints that can generate equivalent files.
- No new persistent data is saved when exporting; the app reads the existing task record and formats it into the requested output.
- The user sees the browser download flow for files or a toast confirming clipboard copy.

## User Preferences And Settings

- This feature centralizes personalization, notification policy, appearance, integrations, and destructive maintenance actions.
- The user can toggle behavior flags, language, theme, notification channels, Google connection state, password changes, memory clearing, agent reset, and full account deletion.
- The backend stores user preferences and notifications on the user document and performs account-wide deletes for destructive actions.
- Data saved includes theme, language, voice defaults, recommendation preferences, email-field visibility, automatic prompt optimisation, and notification settings.
- The user sees saved-state confirmations, connected-account labels, and confirmation steps around dangerous operations.

## Results Archive And Post-Run Review

- This feature is the durable record of completed missions and is accessed from the header Results button or direct navigation.
- The user can browse completed runs, expand logs, export them, copy them, add extracted to-do items to Calendar, or delete entries.
- The backend stores completed tasks and supports retrieval and deletion, while the frontend handles export and display.
- Data saved includes final output, log JSON, original and optimised task text, timing, agent count, and identifiers for future deletion.
- The user sees a clean archive of prior work rather than only transient pipeline output.

# SECTION D — EVERY USER ACTION IN THE APP

## Authentication Actions

- Switch auth mode. The user clicks Login or Register on the auth screen, the form fields change immediately, and no backend call is made until submission.
- Enter name. The user types a name in register mode, the field updates locally, and the value becomes part of the registration payload.
- Enter email. The user types an email on the auth screen, the field updates locally, and the value is sent to the backend when the form is submitted.
- Enter password. The user types a password on the auth screen, the field updates locally, and the value is sent to the backend when the form is submitted.
- Toggle password visibility. The eye button flips the password input between plain text and hidden text, and no backend call occurs.
- Submit login. The Sign In button sends credentials to the login endpoint, updates auth state, stores the token, and lands the user on the dashboard when successful.
- Submit registration. The Create Account button sends name, email, and password to the register endpoint, creates the account and default agents, stores the token, and lands the user on the dashboard when successful.

## Global Layout And Header Actions

- Open mobile sidebar. The user taps the menu button in the header on smaller screens, and the left sidebar slides in over the page.
- Close mobile sidebar. The user taps the close button or the darkened backdrop, and the sidebar slides out again.
- Navigate to dashboard from logo. The user clicks the AgentForge logo area, and the app routes back to the dashboard.
- Toggle language menu. The user clicks the language flag button, and a dropdown of supported languages opens or closes.
- Select language. The user picks a language from the dropdown, Redux updates the selected language, and translated UI text begins to load lazily.
- Connect Google Calendar from header. The user clicks the connect-calendar button, the backend returns an OAuth URL, and a new browser window opens.
- Open calendar drawer. The user clicks the connected calendar icon, Redux opens the calendar panel, and the drawer fetches upcoming events.
- Toggle theme from header. The user clicks the theme button, Redux flips the theme value, and the page theme changes immediately.
- Open results archive. The user clicks the Results button in the header, and the app routes to the archive page.
- Open user menu. The user clicks the avatar, and a small dropdown opens under the avatar.
- Open settings from user menu. The user clicks Settings in the dropdown, the menu closes, and the app routes to the settings page.
- Sign out. The user clicks Sign Out in the dropdown, local auth data is cleared, Redux resets auth state, and the app routes to the auth page.
- Resize right panel. The user drags the desktop divider between the main area and the right panel, and the right panel width changes while dragging.

## Sidebar And Agent Roster Actions

- Collapse or expand sidebar. The user clicks the collapse button in the roster header, and the sidebar shrinks to icon-only mode or expands back to full cards.
- Open chat from sidebar. The user clicks the chat icon in the sidebar header, and the app routes to the chat page.
- Open scheduler from sidebar. The user clicks the scheduler icon, and the app routes to the scheduler page.
- Open agent builder from sidebar. The user clicks the plus icon, and the app routes to the agent builder page.
- Open settings from sidebar. The user clicks the settings icon, and the app routes to settings.
- Expand tool library. The user clicks the Tool Library section while the sidebar is expanded, and the list of tools opens.
- Collapse tool library. The user clicks the Tool Library section again, and the tool list closes.
- Inspect agent. The user clicks an agent card, and the agent modal opens in read-only mode.
- Add agent to pipeline from roster. The user clicks Add on an agent card, Redux adds that agent id to the active pipeline, and the pipeline canvas updates.
- Remove agent from pipeline from roster. The user clicks the added-state button on a roster card, Redux removes that agent id, and the pipeline canvas updates.
- Start editing agent from roster. The user clicks the edit icon on a card, the modal opens in edit mode, and the agent fields are prefilled.
- Delete custom agent from roster. The user clicks delete, confirms, Redux removes the agent, and the card disappears from the roster.

## Agent Builder And Agent Modal Actions

- Type agent name in builder. The user enters a name, local builder state updates, and validation errors clear when corrected.
- Type agent description in builder. The user enters a purpose description, local state updates, and the generator uses that text later.
- Type example tasks in builder. The user enters optional example tasks, which are split later and sent with the prompt-generation payload.
- Generate agent instructions. The user clicks Generate Agent, the backend creates a personality draft, and step two opens with that generated text.
- Go back in builder. The user clicks Back in step two, and the wizard returns to step one without leaving the page.
- Edit role in builder. The user types a role title, the preview updates, and the value becomes part of the new agent record.
- Change category in builder. The user selects a category from the dropdown, and the preview updates immediately.
- Edit generated instructions. The user changes the large personality textarea, and the edited version becomes the saved personality on deploy.
- Toggle a tool in builder. The user clicks any tool pill, the selection updates instantly, and the agent will carry that tool if deployed.
- Choose color in builder. The user clicks a color swatch, and the preview card changes to that color.
- Regenerate instructions in builder. The user clicks Regenerate, a new prompt-generation request is sent, and the personality field is replaced with the new draft.
- Deploy new agent. The user clicks Deploy Agent, Redux adds the new agent, a success toast appears, and the app returns to the dashboard.
- Cancel builder flow. The user clicks Cancel, and the app returns to the dashboard without deploying the draft.
- Close agent modal. The user clicks Close or the backdrop, and the agent modal disappears.
- Edit agent name in modal. The user changes the name field, local modal state updates, and the change is applied when saved.
- Edit agent role in modal. The user changes the role field, local modal state updates, and the change is applied when saved.
- Edit agent instructions in modal. The user changes the instructions box, local modal state updates, and the change is applied when saved.
- Toggle agent tools in modal. The user adds or removes tool pills in edit mode, and the selected tools become part of the saved agent.
- Change agent color in modal. The user clicks a color dot, and the modal preview updates before save.
- Save agent changes. The user clicks Save Changes, Redux updates the selected agent, and the modal closes.
- Inspect agent memory. The user reads memory entries in read-only mode and can scroll through them.

## Dashboard Pipeline Actions

- View empty pipeline state. The user sees the empty-state prompt when no agents are in the pipeline, and no backend call occurs.
- Remove pipeline step from canvas. The user clicks the X on a pipeline node, Redux removes that step, and the sequence re-renders.
- Clear entire pipeline. The user clicks Clear in the pipeline header, Redux empties the full pipeline, and the canvas returns to its empty state.

## Dashboard Task Input Actions

- Type mission text. The user types in the large mission textarea, Redux updates the task goal, and recommendation logic reevaluates shortly after typing stops.
- Type recipient email on dashboard. The user types an optional email, Redux stores it, and that address may be used for delivery if applicable.
- Open file picker for PDF. The user clicks the PDF attachment button, and the system file picker opens.
- Attach PDF. The user selects a PDF, the UI shows processing then ready state, and the file content becomes part of the run attachment state.
- Remove PDF attachment. The user clicks the removal icon on the PDF chip, and the PDF attachment is cleared from state.
- Toggle currency attachment area. The user clicks the Currency button, and the inline currency fields open or close.
- Type currency amount. The user enters a number, and the currency request becomes eligible for preview and execution.
- Type source currency. The user enters a source currency code, and the attached conversion request updates.
- Type target currency. The user enters a target currency code, and the attached conversion request updates.
- Preview currency conversion. The user clicks Preview, the backend returns a live exchange rate if possible, and the preview string is shown inline.
- Remove currency attachment. The user clicks the removal icon on the currency chip, and the conversion request is cleared from state.
- Accept recommended pipeline on dashboard. The user clicks Use This Pipeline, Redux fills the pipeline with the suggested agents, and the banner disappears.
- Use a quick task. The user clicks a quick task chip, and the mission field is populated with that preset text.
- Execute pipeline. The user clicks Execute Pipeline, the frontend starts the pipeline orchestration flow, logs begin streaming, and the run state turns on.
- Clear live logs. The user clicks Clear, the current log array is emptied, and the log panel resets.
- Clear attachments. The user clicks Clear Attach, all active attachments are removed from task state.

## Activity Log And Memory Actions

- Scroll live logs. The user scrolls through the log panel while the run is active or after it finishes.
- Continue to chat from a finished run. The user clicks Continue to Chat on a completed pipeline log, the app routes to chat, and the pipeline result is injected as chat context.
- Type semantic memory search. The user types three or more characters in the memory search box, the frontend sends per-agent semantic search requests, and grouped results appear.
- Clear or shorten memory search. The user deletes text below the threshold, and the panel returns to the default memory-bank view.
- Expand memory full output. The user clicks Show full output on a memory card, and the full saved text opens inside the card.
- Collapse memory full output. The user clicks Hide full output, and the full text area closes.

## Scheduler Actions

- Load schedule list. The page fetches schedules on entry, and the current user’s saved schedules appear in the left column.
- Type schedule task description. The user enters a task, local scheduler state updates, and recommendation logic can begin.
- Accept recommended schedule pipeline. The user clicks Use This Pipeline in the suggestion banner, and the suggested sequence fills the schedule pipeline.
- Open add-agent list in scheduler. The user clicks Add Agent, and the available agent menu opens below the button.
- Close add-agent list in scheduler. The user clicks the same button again, and the menu closes.
- Add schedule pipeline step. The user clicks an agent in the menu, and that agent is appended to the schedule pipeline.
- Remove schedule pipeline step. The user clicks the remove icon on any schedule pipeline slot, and that slot disappears.
- Type recipient email in scheduler. The user enters an email address, and the value becomes part of the schedule payload.
- Choose schedule preset. The user clicks a preset chip, the display string fills the time field, and the parser runs immediately.
- Type natural-language schedule. The user edits the time field, the parser runs after a short delay, and the parse preview updates.
- Submit clarification for ambiguous time. The user fills the clarification field and clicks Clarify, and the parser reruns on the combined phrase.
- Create schedule. The user clicks Schedule It, the backend saves the schedule, the form resets, and the new schedule appears in the active list.
- Delete schedule. The user clicks the trash icon on a schedule card, the backend deletes the record, and the card disappears.
- Pause schedule. The user clicks Pause, the backend marks the schedule inactive, and the UI badge changes to paused.
- Resume schedule. The user clicks Resume, the backend marks the schedule active again, and next-run behavior resumes.
- Run schedule now. The user clicks Run Now, the backend executes the schedule immediately, and the card updates after the run.

## Chat Actions

- Create new chat session. The user clicks New Chat, the backend creates a session, and the new empty conversation becomes active.
- Search chat sessions. The user types in the session search box, and the visible session list filters by title.
- Open chat session. The user clicks any session in the list, and its messages load into the conversation pane.
- Delete chat session. The user clicks the delete icon on a session, the backend removes it, and it disappears from the list.
- Edit session title. The user clicks the edit icon in the chat header, types a new title, and can save it back to the backend.
- Send typed message. The user clicks the send button, the message is stored immediately in Redux and the backend, and a streamed response begins.
- Send message with keyboard. The user presses Enter without Shift, and the same send flow begins.
- Add newline in message box. The user presses Shift and Enter, and the textarea inserts a new line instead of sending.
- Stop streaming reply. The user clicks the stop button during a stream, the active request is aborted, and the response preview stops growing.
- Click starter prompt. The user clicks a suggested empty-state prompt, and the text is inserted into the chat input.
- Click follow-up suggestion chip. The user clicks a follow-up question after a response, and that chip text is inserted into the input box.
- Re-run pipeline from chat. The user clicks Re-run Pipeline on a pipeline-derived session, the saved task and agent order are pushed back into the dashboard state, and the pipeline restarts.
- Read translated message content. The user changes language globally, and message content is translated lazily where translation is available.

## Voice Panel Actions

- Expand voice history. The user clicks the chevron on the floating voice panel, and the recent voice conversation history opens.
- Collapse voice history. The user clicks the chevron again, and the history section closes.
- Toggle continuous mode. The user clicks the AUTO control, and Redux flips the continuous-listening flag.
- Enable or disable voice. The user clicks the power button, the voice-enabled state changes, and the panel becomes active or inactive.
- Start listening. The user clicks the microphone while voice is enabled, browser speech recognition starts, and the panel enters listening state.
- Stop listening. The user clicks the microphone again while listening, speech recognition stops, and the panel returns to idle.
- Mute spoken playback. The user clicks the mute button, Redux marks voice as muted, and future replies are not spoken aloud.
- Unmute spoken playback. The user clicks the same button again, Redux clears mute state, and future replies can be spoken.
- Type voice command. The user types into the small command field, and the typed phrase becomes the next voice-command payload instead of spoken transcript.
- Submit typed voice command. The user presses Enter or clicks the send icon, the backend parses the command, and the panel speaks ARIA’s response when possible.

## Calendar Drawer Actions

- Open calendar drawer. The user clicks the connected calendar icon, and the drawer slides in from the right.
- Close calendar drawer. The user clicks the X button or the darkened backdrop, and the drawer closes.
- Read connection identity. The user sees which Google account is connected at the top of the drawer.
- Choose one of the next seven days. The user clicks a day tile, and the event list changes to that day’s entries.
- Move backward by day. The user clicks the left arrow, and the selected day moves one step earlier within the seven-day range.
- Move forward by day. The user clicks the right arrow, and the selected day moves one step later within the seven-day range.
- Swipe between days on touch devices. The user swipes left or right in the event area, and the selected day changes accordingly.
- Refresh events. The user clicks Refresh, and the backend is asked for the next seven days of events again.
- Open settings from disconnected state. If Calendar is not connected, the user can click Open Settings to route directly to the settings page.
- Open event in Google Calendar. The user clicks Open in Google Calendar on an event card, and the external Google Calendar event page opens in a new tab.

## Settings Actions

- Switch settings tab. The user clicks any tab label, and the right-side content switches immediately.
- Toggle notifications master switch. The user flips the main Notifications control, Redux updates immediately, the backend persists the change, and the page rolls back if saving fails.
- Toggle email notifications. The user flips the Email Notifications switch, and the email-specific controls appear or disappear.
- Edit default notification email. The user types an email address, and the draft value stays local until saved.
- Send test email. The user clicks Test Email, the backend sends a notification test if allowed, and the button shows sending, sent, or failed status.
- Toggle pipeline-completed notifications. The user flips that trigger switch, and the draft notification settings update locally.
- Toggle scheduled-task notifications. The user flips that trigger switch, and the draft notification settings update locally.
- Toggle calendar-created notifications. The user flips that trigger switch, and the draft notification settings update locally.
- Save notification settings. The user clicks Save Settings, the backend stores the notification object, and the button shows a saved state when successful.
- Connect Google Calendar from settings. The user clicks Connect, the backend provides an OAuth URL, and a new browser window opens.
- Disconnect Google Calendar from settings. The user clicks Disconnect, the backend clears stored Google tokens, and the page updates to disconnected state.
- Change password. The user fills current, new, and confirm password fields and submits, and the backend updates the stored password if validation passes.
- Toggle pipeline recommendations preference. The user flips the switch, and the draft preferences object updates.
- Toggle dashboard email field preference. The user flips the switch, and the dashboard email input will be shown or hidden after preferences save and reload.
- Toggle auto-send results preference. The user flips the switch, and the draft preferences object updates.
- Toggle voice-enabled-by-default preference. The user flips the switch, and the draft preferences object updates.
- Toggle automatic prompt optimisation. The user flips the switch, and the draft preferences object updates.
- Save preferences. The user clicks Save in the Preferences tab, and the backend stores the updated preference object.
- Toggle theme in appearance. The user clicks Toggle Theme, and the global theme changes instantly.
- Change language in appearance. The user uses the language selector, and translated UI content starts updating.
- Start clear-memory confirmation. The user clicks Confirm in the clear-memory card, and the destructive confirmation controls open.
- Confirm clear memory. The user clicks Yes, clear, the backend deletes agent memory documents, and a success toast appears.
- Cancel clear memory. The user clicks Cancel, and the confirmation controls close without changing data.
- Start reset-agents confirmation. The user clicks Confirm in the reset-agents card, and the destructive confirmation controls open.
- Confirm reset agents. The user clicks Yes, reset, the backend deletes existing agents and reseeds defaults, and the roster refreshes.
- Cancel reset agents. The user clicks Cancel, and the confirmation controls close.
- Start delete-account confirmation. The user clicks Confirm in the delete-account card, and the typed confirmation flow opens.
- Type delete confirmation text. The user types the required word, and the delete button remains disabled until the text matches exactly.
- Confirm delete account. The user clicks Delete Account, the backend deletes the account and related records, and the app logs out to the auth page.
- Cancel delete account. The user clicks Cancel, and the destructive confirmation flow closes.

## Results Archive Actions

- Open results page. The user routes to Results from the header or by direct navigation, and the page loads completed tasks from the backend.
- Expand archived run. The user clicks View Full Log, and the card opens to show saved log entries plus final output.
- Collapse archived run. The user clicks Hide Log, and the expanded area closes.
- Export archived run as Markdown. The user clicks MD, the browser generates and downloads a Markdown file, and no backend state changes.
- Export archived run as PDF. The user clicks PDF, the browser opens the print-based PDF flow, and no backend state changes.
- Copy archived output. The user clicks Copy, the full output goes to the clipboard, and a toast confirms success or failure.
- Add to calendar from archived to-do output. The user clicks Add to Calendar, the backend creates Google Calendar events from extracted to-do lines, and the user gets a success or failure toast.
- Delete archived run. The user clicks Delete, the backend removes the persisted task when possible, Redux removes the card, and the archive refreshes visually.

# SECTION E — ALL BACKEND ROUTES AND WHAT THEY DO

## Server Root

- GET /health. This returns server status, current timestamp, and live Mongo connection state; it accepts no body, returns a small health object, and does not require authentication.

## routes/agent.js

- POST /api/agent/run. This accepts agent identity, role, personality, tools, context, step metadata, optional agent id, and task goal; it builds a system prompt with memory, calls Ollama once, and returns the completed output for that agent; authentication is not required.
- POST /api/agent/run-stream. This accepts the same agent execution payload as the non-streaming route, streams tokens from Ollama as server-sent events, and ends with a done marker; authentication is not required.
- GET /api/agent/:id/memories/search. This accepts an agent id in the path and a query string in the q parameter, performs vector memory retrieval through Chroma, and returns the matched memory snippets; authentication is not required.
- POST /api/agent/generate-prompt. This accepts a proposed agent name, role, description, and optional example tasks, asks Ollama to generate a system-prompt-style instruction set, and returns the generated personality text; authentication is not required.

## routes/auth.js

- POST /api/auth/register. This accepts name, email, and password, creates the user, seeds default agents, signs a JWT, and returns the token plus a safe user object; authentication is not required.
- POST /api/auth/login. This accepts email and password, validates credentials, signs a JWT, and returns the token plus a safe user object; authentication is not required.
- GET /api/auth/me. This accepts the bearer token, loads the authenticated user, and returns the current user profile without the password hash; authentication is required.
- PUT /api/auth/change-password. This accepts current and new password values, verifies the current password, updates the stored password hash, and returns a success flag; authentication is required.

## routes/chat.js

- GET /api/chat. This accepts the optional authenticated identity or guest id header, loads chat sessions for that user key, and returns the session list; authentication is optional.
- POST /api/chat. This accepts title, task goal, and optional pipeline agents, creates a new chat session, and returns the session object and session id; authentication is optional.
- GET /api/chat/:sessionId. This accepts a session id path parameter, loads that session for the current user key, and returns the full session object; authentication is optional.
- DELETE /api/chat/:sessionId. This accepts a session id path parameter, deletes the matching session for the current user key, and returns success if found; authentication is optional.
- POST /api/chat/:sessionId/messages. This accepts a session id and a message object, verifies access to the session, appends the message, and returns the updated session; authentication is optional.
- PUT /api/chat/:sessionId/title. This accepts a session id and a new title, verifies access, updates the stored title, and returns the updated session; authentication is optional.
- POST /api/chat/stream. This accepts a messages array and an optional system prompt, streams a direct ARIA response from Ollama as server-sent events, and ends with a done marker; authentication is optional.

## routes/tools.js

- POST /api/tools/parse-time. This accepts a natural-language time input string, parses it locally or with Ollama, and returns cron expression, human-readable text, next run time, confidence, and clarification; authentication is not required.
- POST /api/tools/pdf-reader. This accepts either a file URL or base64 PDF content, extracts text from the PDF, and returns success status, content, page count, and word count; authentication is required.
- POST /api/tools/currency-converter. This accepts amount, source currency, and target currency, fetches or reuses exchange rates, and returns the converted value plus rate metadata; authentication is required.
- POST /api/tools/reframe-prompt. This accepts the raw task, pipeline metadata, and attachment hints, reframes the task for better execution, and returns original text, reframed text, and a small change list; authentication is required.
- POST /api/tools/send-email. This accepts recipient, subject, and body, checks the sender’s notification settings and recipient policy, either sends the email or creates a permission request, and returns delivery status; authentication is required.
- POST /api/tools/web_search. This accepts a free-text query, performs a Tavily search, and returns a small list of formatted results; authentication is not required.
- POST /api/tools/calculator. This accepts a math or word-problem expression, solves known patterns directly or falls back to Ollama, and returns a formatted calculation result; authentication is not required.
- POST /api/tools/summarize. This accepts text or equivalent content fields, summarizes the content, and returns summary text; authentication is not required.
- POST /api/tools/email_draft. This accepts optional subject and required context, asks Ollama for a complete email draft, and returns the email text; authentication is not required.
- POST /api/tools/todo. This accepts source content, asks Ollama to produce a structured task plan, and returns the to-do output text; authentication is not required.
- POST /api/tools/translate. This accepts text and a target language code, translates the text, and returns the translated text; authentication is not required.
- GET /api/tools/languages. This returns the list of supported languages from the translation service; authentication is not required.
- POST /api/tools/news. This accepts a topic, performs a news-focused search, and returns both formatted text and structured news items; authentication is not required.
- POST /api/tools/weather. This accepts a location, fetches current and forecast weather, and returns both a formatted summary and structured weather data; authentication is not required.
- POST /api/tools/scheduler. This accepts task description, schedule timing, pipeline or agent identifiers, recipient details, and optional immediate-run hints, creates a schedule, and may also run and deliver it immediately; authentication is required.

## routes/userData.js

- GET /api/user/agents. This returns the current user’s agents after cleanup and deduplication logic; authentication is required.
- POST /api/user/agents. This accepts agent fields and creates a new stored agent for the current user; authentication is required.
- POST /api/user/agents/reset. This deletes the user’s current agents, reseeds the defaults, and returns the refreshed list; authentication is required.
- POST /api/user/agents/sync-all. This updates the stored personalities of the named default agents from the template source and returns success; authentication is required.
- PUT /api/user/agents/:id. This accepts partial agent updates, applies them to the matching owned agent, and returns the updated agent; authentication is required.
- DELETE /api/user/agents/:id. This deletes the matching owned agent and returns a confirmation message; authentication is required.
- GET /api/user/pipeline. This returns the current user’s saved pipeline order, creating an empty pipeline document if needed; authentication is required.
- PUT /api/user/pipeline. This accepts an ordered agent id list, saves it as the user’s pipeline, and returns the updated pipeline; authentication is required.
- GET /api/user/tasks. This accepts an optional limit query and returns the user’s completed task archive; authentication is required.
- POST /api/user/tasks. This accepts task archive payload fields and saves a completed task document; authentication is required.
- DELETE /api/user/tasks/:id. This deletes the matching completed task for the current user and returns a confirmation message; authentication is required.
- GET /api/user/schedules. This returns all schedules for the current user in reverse creation order; authentication is required.
- DELETE /api/user/schedules/:id. This deletes the specified schedule and stops the running cron job if one exists; authentication is required.
- PATCH /api/user/schedules/:id. This accepts an isActive boolean, updates pause or resume state, and returns the updated schedule; authentication is required.
- POST /api/user/schedules/:id/run-now. This executes the specified schedule immediately and returns success; authentication is required.
- GET /api/user/schedules/:id/history. This returns recent history records for the specified schedule; authentication is required.
- GET /api/user/preferences. This returns the current user’s saved preferences and notifications; authentication is required.
- PUT /api/user/preferences. This accepts allowed preference fields, stores them on the user record, and returns the updated preferences; authentication is required.
- PUT /api/user/preferences/notifications. This accepts allowed notification fields, stores them on the user record, and returns the updated notification settings; authentication is required.
- DELETE /api/user/memory. This deletes all agent-memory documents for the current user and returns success; authentication is required.
- DELETE /api/user/account. This deletes the user account and related records across agents, pipeline, tasks, memory, schedules, history, chat, and permission requests; authentication is required.

## routes/voice.js

- POST /api/voice/command. This accepts a transcript and optional recent conversation history, parses the user’s intent into a structured voice command object, and returns that object; authentication is not required.
- POST /api/voice/speak. This accepts text and language, generates speech audio through ElevenLabs when available, and otherwise returns an empty success path to trigger browser fallback; authentication is not required.

## routes/notifications.js

- POST /api/notifications/test. This accepts a channel and optional email address, validates notification eligibility, sends a test email when permitted, and returns send status; authentication is required.

## routes/permissions.js

- GET /api/permissions/accept. This accepts a permission token in the query string, marks the pending request as accepted if valid, sends the held email to the recipient, and returns an HTML confirmation page; authentication is not required.
- GET /api/permissions/decline. This accepts a permission token in the query string, marks the pending request as declined if valid, and returns an HTML decline page; authentication is not required.

## routes/integrations.js

- GET /api/integrations/google/auth. This generates a Google OAuth URL tied to the current user and returns that URL; authentication is required.
- GET /api/integrations/google/callback. This accepts Google OAuth code and state, exchanges tokens, stores them on the user record, and redirects the browser back to the client app; authentication is not required because the OAuth state identifies the user.
- GET /api/integrations/google/status. This returns whether Google Calendar is connected and which account email is associated; authentication is required.
- POST /api/integrations/google/create-events. This accepts an array of to-do strings, creates Google Calendar events from them, and returns links to the created events; authentication is required.
- DELETE /api/integrations/google/disconnect. This clears the stored Google Calendar credentials and returns success; authentication is required.
- GET /api/integrations/google/events. This returns upcoming Google Calendar events for the next seven days; authentication is required.

## routes/export.js

- POST /api/export/markdown. This accepts task goal, logs, agent count, timestamps, and final output, formats the run as Markdown, and returns it as a downloadable file; authentication is not required.
- POST /api/export/pdf. This accepts the same export payload, formats the run as a PDF report, and streams the PDF back as a downloadable file; authentication is not required.

# SECTION F — STATE MANAGEMENT MAP

## agents Slice

- This slice holds the full agent roster, whether the roster has been hydrated from backend data, the currently selected agent, and whether the agent modal is in editing mode.
- It is updated when default agents load, when new agents are deployed, when agents are edited or deleted, when memory entries are appended, and when backend hydration completes.
- It is read by the sidebar roster, agent cards, agent modal, dashboard recommendation logic, pipeline rendering, scheduler pipeline builder, chat specialist detection, voice execution logic, and memory panel.

## pipeline Slice

- This slice holds the current ordered list of agent ids in the active pipeline plus a placeholder error field.
- It is updated when agents are added or removed from the roster cards, the pipeline canvas, voice commands, scheduler pipeline builder handoff, recommendation acceptance, or chat rerun.
- It is read by the dashboard pipeline canvas, header status display, chat rerun logic, and local-storage sync behavior.

## task Slice

- This slice holds the current task goal, optional recipient email, active tool attachments, the latest pipeline result for chat handoff, pipeline run state, active agent id, right-panel tab, and the archive of completed tasks.
- It is updated by dashboard mission typing, attachment actions, pipeline execution progress, completion handling, results hydration, results deletion, and chat handoff logic.
- It is read by the dashboard input, activity log, header running state, results page, chat rerun flow, and useAgentRunner orchestration logic.

## logs Slice

- This slice holds the current live activity log array and begins with an initialization message.
- It is updated throughout pipeline execution as system, tool, thought, output, and error entries are added or streamed.
- It is read almost entirely by the Activity Log panel and by the results archive when past run logs are shown.

## theme Slice

- This slice holds only the current theme value, which is either dark or light.
- It is updated by the header theme button, the appearance settings button, and session restoration when local storage is checked.
- It is read by the top-level app shell and any component that changes styling based on the theme.

## language Slice

- This slice holds the selected language, the list of supported languages, a translation-loading flag, and a translation cache keyed by original text.
- It is updated when the app loads supported languages, when the user changes the selected language, and whenever lazy translation results are cached.
- It is read by the language selector, translation wrapper, chat message translation helper, placeholder translation logic, results export translation logic, and many UI labels.

## voice Slice

- This slice holds whether voice is enabled, listening, speaking, muted, or processing, plus the last transcript, last parsed command, rolling voice conversation history, continuous-listening mode, and active voice engine.
- It is updated by the floating voice panel, the voice hook, parser results, text-to-speech events, and mute or continuous mode controls.
- It is read by the voice panel, app startup preference hydration, and any logic that needs to know whether the app should speak or listen.

## auth Slice

- This slice holds the current user, token, authentication status, Google Calendar connection state, whether the calendar panel is open, notification settings, user preferences, loading state, and auth error.
- It is updated during auth restore, login, registration, logout, settings saves, Google status checks, notification toggles, and calendar drawer state changes.
- It is read by route protection, the header, settings, dashboard mission input, scheduler recommendations, app initialization, and voice default enabling.

## chat Slice

- This slice holds the current session list, the active session id, a loading placeholder, and the session search query.
- It is updated when sessions are loaded, created, selected, renamed, deleted, or appended with new messages.
- It is read by the chat page, pipeline-to-chat handoff, and chat rerun logic.

## Important Local Component State

- The dashboard task input keeps transient attachment UI state such as upload status, preview strings, suggestion visibility, and inline currency controls that are important to the user experience even though the attachment payload itself is also mirrored into Redux.
- The scheduler page keeps most of its form and parser state locally, including the schedule draft, parse confidence, clarification prompt, in-progress action states, and the temporary pipeline being assembled for the schedule.
- The chat page keeps its live input text, stream preview, follow-up chips, detected specialist agent, title-editing state, and abort controller references locally because those values are session-specific and short-lived.
- The voice panel keeps expanded or collapsed state and the current typed command locally, while the persistent voice behavior state lives in Redux.
- The app layout keeps sidebar open state, right-panel width, and drag state locally because those are visual layout concerns rather than cross-page business state.
- The settings page keeps draft notification and preference objects locally until save, along with confirmation flags for destructive actions.
- The auth page keeps current mode, password visibility, and form field values locally because they only matter inside the authentication screen.

# SECTION G — DATA MODELS

## User

- This model represents a registered account that owns almost all other user-specific records in the system.
- It stores name, email, password hash, Google Calendar connection details, notification preferences, UI and behavior preferences, and created time.
- It relates to agents, pipelines, completed tasks, schedules, agent memories, chat sessions, and permission requests through the shared user id rather than explicit foreign-key references.
- User documents are created during registration, updated during password changes, settings changes, notification saves, Google OAuth connection and disconnection, and deleted when the account is deleted.

## Agent

- This model represents one saved AI specialist belonging to a user.
- It stores user id, name, role, personality instructions, equipped tools, color, whether the agent is a default seed, and created time.
- It relates to pipelines by agent id order, to schedules through stored agent ids and pipeline snapshots, and to agent memory records by agent id.
- Agent documents are created when defaults are seeded or new agents are saved, updated during editing or sync, and deleted when agents are removed, reset, or the account is deleted.

## Pipeline

- This model represents the saved ordered pipeline for one user.
- It stores user id, a pipeline name, the ordered array of agent ids, and the last updated time.
- It relates to agents through the stored order list and effectively acts as the user’s current working pipeline.
- Pipeline documents are created lazily on first request, updated whenever the pipeline order changes, and deleted when the account is deleted.

## CompletedTask

- This model represents one archived pipeline run.
- It stores user id, optional pipeline id, task goal, original task, optimised task, final output, log JSON, agent count, duration, and created time.
- It relates back to the user and indirectly to the pipeline and agents used in that run through stored metadata rather than strict references.
- Completed-task documents are created when a pipeline finishes and is persisted, may be read many times in the results archive, and are deleted individually or as part of account deletion.

## AgentMemory

- This model represents a stored memory record for one agent and one user.
- It stores agent id, user id, task goal, summary text, full output, and created time.
- It relates to the Agent model by agent id and supports memory search and retrieval during future runs.
- Memory documents are created after pipeline agent steps complete, read during memory search and retrieval, and deleted through memory clearing or account deletion.

## Schedule

- This model represents a saved automated task.
- It stores user id, schedule name, agent ids, a pipeline snapshot with names and colors, task goal, cron expression, timezone, email, optional phone, active flag, last run time, next run time, run count, and created time.
- It relates to ScheduleHistory by schedule id and to the user and agents by stored ids.
- Schedule documents are created on scheduler submission, updated when paused, resumed, run, or re-timed, and deleted manually or during account deletion.

## ScheduleHistory

- This model represents one execution record for a schedule.
- It stores schedule id, run time, created time, a summary, and whether the run succeeded.
- It relates directly to the Schedule model by schedule id and supports the schedule history view and audit trail.
- History documents are created when scheduled executions are recorded and are deleted when the account is deleted.

## ChatSession

- This model represents one persistent chat or pipeline-follow-up conversation.
- It stores user id, session id, title, optional task goal, optional pipeline-agent metadata, an array of message objects, created time, and updated time.
- Each message stores message id, role, optional agent name and color, content, optional tools used, timestamp, and a streaming flag.
- Chat sessions are created when the user starts a new chat or pipeline handoff, updated whenever messages or titles change, and deleted manually or during account deletion.

## PermissionRequest

- This model represents a pending approval workflow for sending email to a non-default recipient.
- It stores a unique token, the sender’s user id and identity details, the target email address, the held email content and subject, expiry time, status, and created time.
- It relates to the user through the sender id and influences whether a held email is delivered after external approval.
- Permission requests are created when an email targets an unapproved external address, updated when accepted, declined, or expired, and deleted during account deletion.

# SECTION H — VOICE CONTROL READINESS PER FEATURE

## Pipeline Features

- Pipeline execution with multiple agents is partially voice controllable today because the parser can add named agents, set a task, and run the pipeline. The ideal command is “Add Scout, Atlas, and Quill, then run this task,” the system needs agent names plus task text, and the complexity is medium because it may combine multiple actions.
- Prompt reframing before pipeline runs is indirectly voice controllable because it runs automatically when the pipeline starts and the preference is enabled. The ideal command is “Run this task with prompt optimisation,” the system needs the task plus the preference state or an override flag, and the complexity is medium.
- Smart pipeline recommendations are not directly voice controllable today because there is no command that asks the app to preview a recommendation instead of naming agents explicitly. The ideal command is “Suggest the best pipeline for this task,” the system needs the task text and current agent roster, and the complexity is medium.
- Agent creation and customisation is only partially voice controllable because the current parser can open the builder but cannot fill the builder fields. The ideal command is “Create a new agent named Nova for competitor research using web search and summarizer tools,” the system needs a name, role, description, tool list, and maybe color, and the complexity is complex.
- Tool equipping on agents is not currently voice controllable because the app has no command path into the modal edit controls. The ideal command is “Equip Atlas with calculator and currency converter,” the system needs the target agent and tool list, and the complexity is medium.
- PDF reader use is not currently voice controllable because voice cannot attach files. The ideal command is “Use the attached PDF to answer this question,” the system needs a selected attachment plus task text, and the complexity is complex because it depends on prior file selection.
- Currency converter use is not currently voice controllable in the attachment UI, although a spoken task can still mention a conversion and the pipeline may handle it if the right agent and tool are present. The ideal command is “Convert 100 dollars to rupees and include it in the run,” the system needs amount, source currency, target currency, and target task context, and the complexity is medium.
- Disabled tools such as image analysis, code execution, database query, and chart generation are not voice controllable because they are not currently active in the product. Their ideal commands would each require both a target dataset or asset and tool-specific parameters, and the complexity would range from medium to complex.

## Scheduling And Delivery Features

- Schedule creation is not currently voice controllable end to end because the parser does not fill scheduler fields or navigate there directly. The ideal command is “Schedule this pipeline every Monday at 9 AM to send to me,” the system needs task text, pipeline steps, recipient, cadence, and time, and the complexity is complex.
- Natural-language cron parsing is not directly voice controlled today because the schedule form owns that parser interaction. The ideal command is “Set the schedule for every other day at 10:30 AM,” the system needs a time phrase and active schedule draft, and the complexity is medium.
- Schedule pause, resume, delete, and run-now actions are not voice controllable today because the parser does not target schedule cards. The ideal commands are direct verbs such as “Pause my market summary schedule,” the system needs the schedule identity and intended action, and the complexity is medium.
- Notifications and delivery settings are not voice controllable today except for mute and unmute in the voice panel itself. The ideal commands are phrases such as “Turn on email notifications” or “Set my default results email to name@example.com,” the system needs the setting name and possibly a value, and the complexity is medium.
- Google Calendar connection state is not voice controllable today. The ideal commands are “Connect Google Calendar” or “Show my next seven days of events,” the system needs auth state and possibly OAuth handoff ability, and the complexity is medium for viewing and complex for connection.
- Export features are not voice controllable today because the parser cannot target the Results page actions. The ideal commands are “Export the latest result as Markdown” or “Copy the last run,” the system needs the result identity and export format, and the complexity is simple.

## Chat And Archive Features

- Chat session creation and message sending are not voice controllable through the chat page itself, but the voice panel can accept freeform conversational input globally. The ideal command is “Open chat and ask ARIA about yesterday’s pipeline,” the system needs destination page, session selection rules, and the spoken message, and the complexity is medium.
- Session search, title editing, deletion, and follow-up chip selection are not currently voice controllable. The ideal commands would need session identity or index, and the complexity is medium.
- Pipeline handoff into chat is partially voice controllable only in the sense that a user can run a pipeline by voice and then continue speaking through the floating panel. The ideal command is “Continue this run in chat,” the system needs the most recent pipeline result, and the complexity is simple.
- Results archive browsing is not voice controllable today because navigation commands do not include chat, scheduler, or settings, and result-level actions are not parsed. The ideal commands are “Open results,” “Expand the latest run,” or “Delete that archived result,” the system needs archive selection context, and the complexity is medium.

## Settings And Global UI Features

- Navigation to dashboard, builder, and results is currently voice controllable because the parser and frontend both support those destinations. The ideal commands are “Go to dashboard,” “Open the builder,” and “Show results,” the system needs only the destination, and the complexity is simple.
- Navigation to chat, scheduler, and settings is not currently voice controllable because those destinations are not implemented in the parser response contract. The ideal commands are simple page names, the system needs only the destination, and the complexity is simple.
- Theme toggle is currently voice controllable because the parser can request it and the frontend executes it. The ideal command is “Switch the theme,” the system needs no additional data, and the complexity is simple.
- Voice enable, disable, mute, unmute, and continuous-listening controls are only partly voice controllable. Mute and unmute exist in the parser and frontend, while toggle voice exists in the parser prompt but is not handled by the frontend, so the ideal commands require consistent implementation plus access to current voice state, and the complexity is simple.
- Language changes are not voice controllable today. The ideal command is “Change the app language to Hindi,” the system needs the target language code and maybe translation availability, and the complexity is simple.
- Agent modal read and edit actions are not voice controllable today. The ideal commands would need a selected agent and a field to change, and the complexity is medium.

## Readiness By Action Category From Section D

- Authentication form entry actions are not voice ready because there is no secure field-filling or submit path through the voice parser. The ideal commands would require sensitive credential capture, and the complexity is complex.
- Global navigation actions are partly ready because dashboard, builder, and results already work while chat, scheduler, and settings do not. The missing destinations only need parser expansion and frontend routing support, so their complexity is simple.
- Agent roster add and clear pipeline actions are partly ready because add-agents and clear-pipeline intents exist, but remove-specific-agent intents are not executed even though the parser schema mentions removal. The ideal commands need named agent resolution, and the complexity is medium.
- Builder field-entry actions are not ready because the current voice layer can only open the builder, not drive its fields. The ideal commands require a guided multi-slot capture flow, and the complexity is complex.
- Dashboard task typing is ready in a limited way because voice can set the task goal. The ideal command is “Set the task to summarize the attached report,” the system needs only the task string unless attachments are referenced, and the complexity is simple.
- Attachment controls are not voice ready because the voice layer cannot open native file pickers or populate attachment-specific UI state. The ideal commands need prior selected files or structured slot filling, and the complexity is complex.
- Scheduler card actions are not ready because schedules are not exposed to the parser. The ideal commands need schedule selection and the intended action, and the complexity is medium.
- Chat send and converse actions are ready in a broad sense because the voice panel already supports conversational responses and command parsing, but they are not tied to explicit chat-session controls. The ideal commands need clearer page routing and active session context, and the complexity is medium.
- Settings toggles are mostly not ready except theme and mute or unmute. The ideal commands need a settings-action catalog and boolean or value slot filling, and the complexity is medium.
- Results export and delete actions are not ready. The ideal commands need archive selection plus an action verb, and the complexity is medium.

# SECTION I — COMPLETE VOICE COMMAND DESIGN

## Navigation Commands

- Trigger phrase: “Go to dashboard.” Variations: “Open dashboard,” “Take me home,” and “Show the main page.” Exact action: route to the dashboard page. Handler: global voice parser plus app-level navigation dispatcher.
- Trigger phrase: “Open agent builder.” Variations: “Create an agent,” “Go to builder,” and “Show the agent builder.” Exact action: route to the builder page. Handler: global voice parser plus app-level navigation dispatcher.
- Trigger phrase: “Open scheduler.” Variations: “Go to schedules,” “Show scheduling,” and “Take me to scheduler.” Exact action: route to the scheduler page. Handler: global voice parser plus app-level navigation dispatcher.
- Trigger phrase: “Open chat.” Variations: “Go to chat,” “Show conversations,” and “Open ARIA chat.” Exact action: route to the chat page. Handler: global voice parser plus app-level navigation dispatcher.
- Trigger phrase: “Open settings.” Variations: “Go to settings,” “Show preferences,” and “Open configuration.” Exact action: route to the settings page. Handler: global voice parser plus app-level navigation dispatcher.
- Trigger phrase: “Open results.” Variations: “Show archive,” “Go to results,” and “Open mission archive.” Exact action: route to the results page. Handler: global voice parser plus app-level navigation dispatcher.

## Pipeline Commands

- Trigger phrase: “Add Scout to the pipeline.” Variations: “Include Scout,” “Use Scout,” and “Put Scout in the workflow.” Exact action: add one named agent to the active pipeline. Handler: voice parser plus pipeline Redux dispatcher.
- Trigger phrase: “Add Scout, Atlas, and Quill.” Variations: “Build a pipeline with Scout, Atlas, and Quill,” and “Use these agents.” Exact action: add multiple named agents in spoken order. Handler: voice parser plus pipeline Redux dispatcher.
- Trigger phrase: “Remove Atlas from the pipeline.” Variations: “Take Atlas out,” and “Delete Atlas from this workflow.” Exact action: remove one named agent from the active pipeline. Handler: voice parser plus pipeline Redux dispatcher.
- Trigger phrase: “Clear the pipeline.” Variations: “Remove all agents,” and “Start over on the pipeline.” Exact action: clear all pipeline steps. Handler: voice parser plus pipeline Redux dispatcher.
- Trigger phrase: “Set the task to summarize this report.” Variations: “My task is,” and “Use this mission.” Exact action: replace the current dashboard mission text. Handler: voice parser plus task Redux dispatcher.
- Trigger phrase: “Suggest the best pipeline for this task.” Variations: “Recommend a workflow,” and “What pipeline should I use.” Exact action: run client-side recommendation logic and show a recommendation state. Handler: voice parser plus dashboard recommendation controller.
- Trigger phrase: “Use the recommended pipeline.” Variations: “Accept the suggestion,” and “Apply that workflow.” Exact action: accept the currently displayed recommendation. Handler: dashboard task input or scheduler recommendation controller.
- Trigger phrase: “Run the pipeline.” Variations: “Execute now,” “Start the workflow,” and “Go ahead.” Exact action: start pipeline execution with current task and pipeline. Handler: voice parser plus useAgentRunner.
- Trigger phrase: “Stop the current run.” Variations: “Cancel pipeline,” and “Abort execution.” Exact action: stop the active pipeline safely and freeze logs. Handler: useAgentRunner with cancellation support added.
- Trigger phrase: “Continue this run in chat.” Variations: “Open this result in chat,” and “Take the last run to chat.” Exact action: route to chat with current pipeline result context. Handler: activity log or app-level handoff controller.

## Agent Commands

- Trigger phrase: “Create a new agent.” Variations: “Make an agent,” and “Start agent creation.” Exact action: open the builder page and begin guided capture. Handler: voice parser plus builder page.
- Trigger phrase: “Create an agent named Nova for competitor research.” Variations: “Make a research agent called Nova,” and “Build an agent for competitor analysis.” Exact action: prefill builder name, role, and description fields. Handler: builder voice form controller.
- Trigger phrase: “Give Nova web search and summarizer.” Variations: “Equip Nova with web search and summary,” and “Add these tools to Nova.” Exact action: toggle the named tools on the selected or named agent. Handler: agent modal or builder voice controller.
- Trigger phrase: “Change Nova’s color to teal.” Variations: “Set Nova’s color,” and “Use a teal avatar for Nova.” Exact action: update the selected color in the builder or modal. Handler: agent modal or builder voice controller.
- Trigger phrase: “Save this agent.” Variations: “Deploy the agent,” and “Finish creating the agent.” Exact action: validate the current draft and save it. Handler: builder or modal save controller.
- Trigger phrase: “Edit Atlas.” Variations: “Open Atlas,” and “Customize Atlas.” Exact action: open the named agent in the modal, optionally in edit mode. Handler: sidebar or modal controller.
- Trigger phrase: “Delete my custom agent Nova.” Variations: “Remove Nova,” and “Delete that agent.” Exact action: delete the named non-default agent after confirmation. Handler: roster delete flow.

## Scheduler Commands

- Trigger phrase: “Create a schedule for this task.” Variations: “Schedule this workflow,” and “Automate this run.” Exact action: open the scheduler page with the current task and pipeline prefilled. Handler: scheduler page preload controller.
- Trigger phrase: “Schedule this every Monday at 9 AM.” Variations: “Run this weekly on Monday at nine,” and “Set this for Mondays at nine.” Exact action: fill the scheduler time phrase and parse it. Handler: scheduler page plus parse-time endpoint.
- Trigger phrase: “Send it to me every day at 6 PM.” Variations: “Deliver daily at six,” and “Email me this every evening at six.” Exact action: set recipient and cadence in the scheduler draft. Handler: scheduler page voice form controller.
- Trigger phrase: “Use Scout and Quill for this schedule.” Variations: “Build the schedule pipeline with Scout and Quill,” and “Add Scout then Quill.” Exact action: populate the scheduler pipeline in spoken order. Handler: scheduler page pipeline builder.
- Trigger phrase: “Save this schedule.” Variations: “Create the schedule,” and “Confirm automation.” Exact action: submit the current scheduler draft. Handler: scheduler form submit controller.
- Trigger phrase: “Run the market summary schedule now.” Variations: “Execute that schedule now,” and “Start my market summary automation.” Exact action: find the named schedule and trigger run-now. Handler: scheduler list controller.
- Trigger phrase: “Pause the daily digest schedule.” Variations: “Stop that schedule for now,” and “Suspend the daily digest.” Exact action: set the named schedule inactive. Handler: scheduler list controller.
- Trigger phrase: “Resume the daily digest schedule.” Variations: “Restart that schedule,” and “Turn the daily digest back on.” Exact action: set the named schedule active again. Handler: scheduler list controller.
- Trigger phrase: “Delete the daily digest schedule.” Variations: “Remove that schedule,” and “Cancel the daily digest automation.” Exact action: delete the named schedule. Handler: scheduler list controller.

## Chat Commands

- Trigger phrase: “Start a new chat.” Variations: “Open a new conversation,” and “Begin chatting.” Exact action: create and activate a new chat session. Handler: chat page controller.
- Trigger phrase: “Open the latest chat.” Variations: “Show my most recent session,” and “Go to the last conversation.” Exact action: activate the newest chat session. Handler: chat page session list controller.
- Trigger phrase: “Search chats for pricing.” Variations: “Find conversations about pricing,” and “Look up the pricing chat.” Exact action: populate the session search field and filter the session list. Handler: chat page search controller.
- Trigger phrase: “Rename this chat to investor research.” Variations: “Call this chat investor research,” and “Change the title to investor research.” Exact action: update the active session title. Handler: chat header edit controller.
- Trigger phrase: “Send this message.” Variations: “Ask ARIA,” and “Message the assistant.” Exact action: submit the current composed chat message. Handler: chat input controller.
- Trigger phrase: “Use Lens for this question.” Variations: “Let Lens answer,” and “Route this to Lens.” Exact action: bias the current message toward the named specialist agent. Handler: chat composition controller.
- Trigger phrase: “Stop speaking.” Variations: “Mute that response,” and “Stop the voice reply.” Exact action: mute voice playback or stop the current spoken response. Handler: voice panel plus chat voice controller.

## Settings Commands

- Trigger phrase: “Turn notifications on.” Variations: “Enable notifications,” and “Switch notifications on.” Exact action: enable the master notification setting. Handler: settings notification controller.
- Trigger phrase: “Turn email notifications off.” Variations: “Disable email alerts,” and “Stop email notifications.” Exact action: disable the email notification switch. Handler: settings notification controller.
- Trigger phrase: “Set my default email to name@example.com.” Variations: “Use this email for results,” and “Change my notification email.” Exact action: update the notification email draft and save it. Handler: settings notification controller.
- Trigger phrase: “Connect Google Calendar.” Variations: “Link my calendar,” and “Start calendar connection.” Exact action: open the Google OAuth flow. Handler: settings integrations controller.
- Trigger phrase: “Disconnect Google Calendar.” Variations: “Unlink my calendar,” and “Remove calendar access.” Exact action: clear stored Google connection state. Handler: settings integrations controller.
- Trigger phrase: “Use dark mode.” Variations: “Switch to dark theme,” and “Turn on dark theme.” Exact action: set the theme to dark. Handler: theme controller.
- Trigger phrase: “Use Hindi.” Variations: “Change the app language to Hindi,” and “Switch language to Hindi.” Exact action: set the selected language. Handler: language selector controller.
- Trigger phrase: “Turn on prompt optimisation.” Variations: “Enable automatic prompt optimisation,” and “Optimize prompts before runs.” Exact action: update and save that preference. Handler: settings preference controller.

## System Commands

- Trigger phrase: “Enable voice control.” Variations: “Turn voice on,” and “Wake voice controls.” Exact action: enable the global voice system. Handler: voice panel controller.
- Trigger phrase: “Disable voice control.” Variations: “Turn voice off,” and “Shut down voice controls.” Exact action: disable the global voice system. Handler: voice panel controller.
- Trigger phrase: “Mute voice.” Variations: “Stop speaking responses,” and “Silence ARIA.” Exact action: set mute on. Handler: voice panel controller.
- Trigger phrase: “Unmute voice.” Variations: “Speak again,” and “Turn responses back on.” Exact action: clear mute. Handler: voice panel controller.
- Trigger phrase: “Turn continuous listening on.” Variations: “Keep listening,” and “Enable auto listening.” Exact action: set continuous mode true. Handler: voice panel controller.
- Trigger phrase: “Turn continuous listening off.” Variations: “Disable auto listening,” and “Stop always listening.” Exact action: set continuous mode false. Handler: voice panel controller.
- Trigger phrase: “What can you do?” Variations: “List your commands,” and “How can I control this app by voice.” Exact action: speak a compact help summary based on current capabilities. Handler: voice parser plus help response generator.

# SECTION J — IMPLEMENTATION ROADMAP

1. Build a single app-wide voice action registry that maps command intents to concrete UI actions. This comes first because every later voice feature needs one consistent dispatcher, and it should touch the voice hook, the floating voice panel, the global app shell, the routing layer, and the backend voice parser. Complexity: medium.
2. Expand the backend voice parser contract to include every real page destination and every existing action family. This comes second because the frontend cannot execute actions it never receives, and it will involve the voice parser service plus the voice route and the frontend command executor. Complexity: medium.
3. Add structured slot extraction for common entities such as agent names, schedule names, page names, email addresses, dates, times, currencies, and export formats. This belongs early because nearly every non-trivial command depends on reliable entity capture, and it will involve the parser service, command validation logic, and shared client-side command helpers. Complexity: complex.
4. Implement full navigation voice support for dashboard, builder, scheduler, chat, settings, results, and modal-level openings. This should happen before deep feature control so the user can at least reach every page by voice, and it will involve the global navigation dispatcher, header-level handlers, and page activation logic. Complexity: simple.
5. Add complete dashboard command support for setting the task, adding or removing agents, clearing the pipeline, accepting recommendations, and starting or stopping runs. This comes next because dashboard execution is the app’s core workflow, and it will involve the roster components, pipeline slice, task slice, recommendation controller, and pipeline runner hook. Complexity: medium.
6. Add guided voice forms for agent creation and editing. This must follow the shared entity and navigation foundation because it requires multi-turn slot filling, confirmation, and save behavior across the builder page and agent modal. Complexity: complex.
7. Add guided voice forms for scheduler creation, including natural-language timing, recipient capture, and schedule pipeline assembly. This comes after the dashboard flow because it reuses task and pipeline concepts but adds more slots and validation, and it will involve the scheduler page, parse-time endpoint, schedule routes, and schedule list handlers. Complexity: complex.
8. Add explicit voice support for chat-session management, including new session creation, session search, title renaming, message sending, and pipeline rerun. This belongs after navigation and dashboard control because it depends on stable route control and session identity resolution, and it will involve the chat page, chat slice, chat routes, and voice hook. Complexity: medium.
9. Add voice control for settings, theme, language, notification toggles, Google Calendar connection shortcuts, and non-destructive maintenance actions. This should wait until the parser and navigation are mature because settings actions are broad but individually simple, and it will involve the settings page, auth slice, language slice, theme slice, and integration routes. Complexity: medium.
10. Add voice support for results archive actions such as opening the latest result, expanding a run, exporting, copying, and adding tasks to calendar. This comes later because it depends on archive identity selection and on stable navigation, and it will involve the results page, completed task slice, export helpers, and calendar integration flow. Complexity: medium.
11. Add attachment-aware voice workflows for PDF usage and future file-based tools. This must come late because browser file pickers and attachment references are awkward in voice-only flows, and it will involve task input, attachment state, PDF processing, and any future re-enabled tool flows. Complexity: complex.
12. Add confirmation dialogs, undo paths, spoken error recovery, and accessibility polish across all voice actions. This is last because it refines the finished command surface, and it will involve the voice panel, toast and dialog patterns, parser response speech, and all page-level action handlers. Complexity: medium.