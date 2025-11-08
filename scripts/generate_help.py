import json
import itertools
import textwrap
from pathlib import Path

TARGET_WORDS = 2000


def word_count(paragraphs: list[str]) -> int:
    return sum(len(p.split()) for p in paragraphs)


def extend_with_generator(content: list[str], generator, target: int = TARGET_WORDS) -> None:
    for paragraph in generator:
        content.append(paragraph)
        if word_count(content) >= target:
            break


def make_wrapped(text: str) -> str:
    return textwrap.fill(text.strip(), 100)


def orientation_generator():
    times = [
        "6:45 a.m.",
        "7:30 a.m.",
        "8:15 a.m.",
        "9:00 a.m.",
        "10:10 a.m.",
        "12:05 p.m.",
        "1:45 p.m.",
        "3:20 p.m.",
        "4:55 p.m.",
        "6:40 p.m.",
        "8:15 p.m.",
        "9:50 p.m.",
    ]
    roles = [
        "sales development rep",
        "partnerships lead",
        "growth marketer",
        "operations manager",
        "rev-ops analyst",
        "agency owner",
        "client success director",
        "regional leader",
    ]
    locations = [
        "a calm home office",
        "a bustling coworking space",
        "the quiet library nook",
        "an airport lounge",
        "a sunlit conference room",
        "a hotel lobby",
        "the team war room",
        "a coffee shop counter",
    ]
    focus_points = [
        "the matte gray canvas that frames every surface",
        "the violet loader pulsing with #4F55F1 energy",
        "the navigation rail icons glowing on hover",
        "the top strip with its crisp credit badge",
        "the gentle shadow around the central content card",
        "the help dropdown tucked behind the avatar",
        "the smooth transitions between the rail sections",
        "the way the typography stays legible on every display",
    ]
    rituals = [
        "set a new bookmark for `/help`",
        "note the current credit balance in the daily log",
        "open the avatar menu to preview the help options",
        "switch between Home and Enrich to feel the layout",
        "resize the window to test responsive behavior",
        "toggle between tabs to test session persistence",
        "invite a teammate to observe the UI cues",
        "pair the orientation with a recap email",
    ]
    insights = [
        "orientation is faster when the visuals stay consistent",
        "the calm palette keeps focus on the workflow",
        "the UI makes it obvious where to start each task",
        "micro-interactions reassure new teammates instantly",
        "speed comes from recognizing the rail icons",
        "bookmarking the help center reduces ramp time",
        "clarity comes from the hero sections on every page",
        "steady rhythms make cross-team onboarding easier",
    ]
    closings = [
        "They end the note by sharing screenshots in Slack, keeping knowledge transparent.",
        "They summarise the lesson in the orientation checklist before moving on.",
        "They tag a teammate with a reminder to review credit usage later that day.",
        "They drop a quick voice memo describing which icons mattered most.",
        "They capture a Loom walkthrough to reuse for the next hire.",
        "They jot action items inside the onboarding playbook so nothing is forgotten.",
        "They compare the desktop and mobile layouts to build confidence on every device.",
        "They close the session by bookmarking `/jobs` alongside the help hub.",
    ]
    counter = itertools.count(1)
    for time, role, location, focus, ritual, insight, closing in itertools.zip_longest(
        itertools.cycle(times),
        itertools.cycle(roles),
        itertools.cycle(locations),
        itertools.cycle(focus_points),
        itertools.cycle(rituals),
        itertools.cycle(insights),
        itertools.cycle(closings),
    ):
        idx = next(counter)
        text = (
            f"Orientation Field Note {idx}: At {time} the {role} opens AuthorityPoint from {location}. "
            f"They linger over {focus} and {ritual}. "
            f"The walkthrough highlights how {insight}, reinforcing the matte gray canvas and #4F55F1 accents as practical guides. "
            f"They revisit the avatar dropdown, rehearse the navigation order, and imagine how a brand-new teammate would interpret each cue. "
            f"{closing}"
        )
        yield make_wrapped(text)


def dashboard_generator():
    windows = [
        "the first fifteen minutes of the workday",
        "a pre-lunch huddle",
        "the post-standup quiet block",
        "an afternoon metrics review",
        "a twilight recap with leadership",
        "a weekend spot-check",
        "the final review before vacation",
        "a late-night catch-up after an event",
    ]
    data_focus = [
        "the credits pill ticking down after big campaigns",
        "the plan status banner confirming renewal timing",
        "the Recent Transactions ledger revealing add-on purchases",
        "the welcome headline anchoring the workspace identity",
        "the history chart comparing week-over-week output",
        "the CTA buttons for topping up credits",
        "the subtle dividers that separate account metrics",
        "the inline loader signalling fresh data pulls",
    ]
    analytic_actions = [
        "export the ledger and annotate each debit with campaign names",
        "compare credits remaining to the campaign calendar",
        "capture a screenshot for finance and annotate it in Notion",
        "tag the marketing lead to confirm upcoming launches",
        "note the renewal date in the revenue operations calendar",
        "document add-on usage for quarterly planning",
        "draft a mini-brief summarizing the week's credit motion",
        "log variances between expected and actual consumption",
    ]
    reflections = [
        "dashboard fluency keeps the team proactive rather than reactive",
        "the simple layout turns complex metrics into a shared language",
        "visual hierarchy makes it impossible to miss urgent signals",
        "habitual reviews catch anomalies before they become blockers",
        "consistent spacing keeps the experience calm even during busy weeks",
        "the violet highlights reinforce when action is required",
        "transparency builds trust with finance partners",
        "a daily glance prevents end-of-month scrambles",
    ]
    followups = [
        "They document the observations in the playbook so the next shift inherits context.",
        "They nudge the billing owner to prepare an add-on request in advance.",
        "They create a task for the research pod to pace uploads against credit supply.",
        "They post the highlights in the revenue Slack channel to keep stakeholders looped in.",
        "They schedule a cross-functional sync to share insights from the ledger.",
        "They record a quick walkthrough showing how to interpret the status section.",
        "They attach the dashboard snapshot to their weekly executive memo.",
        "They align the numbers with CRM outcomes, closing the loop on ROI tracking.",
    ]
    counter = itertools.count(1)
    for window, focus, action, reflection, followup in itertools.zip_longest(
        itertools.cycle(windows),
        itertools.cycle(data_focus),
        itertools.cycle(analytic_actions),
        itertools.cycle(reflections),
        itertools.cycle(followups),
    ):
        idx = next(counter)
        text = (
            f"Dashboard Interpretation Log {idx}: During {window}, the team studies {focus}. "
            f"They {action} while the interface maintains its clean matte backdrop and #4F55F1 accent cues. "
            f"Everyone agrees that {reflection}, so the Home page becomes a living briefing rather than a static screen. "
            f"{followup}"
        )
        yield make_wrapped(text)


def dataprep_generator():
    intentions = [
        "segment a fresh batch of investor prospects",
        "refresh customer expansion lists",
        "curate community-led growth champions",
        "organize regional partner leads",
        "prepare analyst outreach for an upcoming report",
        "assemble founder-introduced warm leads",
        "revisit dormant accounts for reactivation",
        "design a pilot list for a new vertical",
    ]
    workspaces = [
        "Google Sheets with color-coded filters",
        "Excel workbooks full of pivot tables",
        "Airtable bases synced with CRM tags",
        "Notion databases linked to research notes",
        "shared drives structured by campaign code",
        "version-controlled folders with changelog files",
        "secure workbooks stored in encrypted spaces",
        "collaborative spreadsheets with granular permissions",
    ]
    refinement_actions = [
        "standardize headers into lowercase_with_underscores",
        "validate emails and highlight questionable domains",
        "trim whitespace and normalize capitalization",
        "insert segmentation columns for persona and region",
        "log source URLs for every key fact",
        "flag rows requiring compliance approval",
        "split long achievements into concise bullet phrases",
        "record research owner initials for accountability",
    ]
    reminders = [
        "clarity at this stage guarantees smooth wizard uploads",
        "fresh facts drive vibrant personalization lines",
        "organized data shortens QA cycles downstream",
        "documented sources protect the team during audits",
        "versioning enables clear post-campaign retrospectives",
        "shared templates keep freelancers aligned with house style",
        "segment labels power analytics after export",
        "detailed briefs make approvals faster when stakeholders review",
    ]
    endnotes = [
        "They update the changelog with a summary of edits and insights gathered.",
        "They upload the cleaned sheet to the shared folder and tag reviewers.",
        "They message the operations channel with a checklist of pending approvals.",
        "They attach the dataset brief to the campaign ticket for easy reference.",
        "They capture lessons in the personalization playbook with before-and-after samples.",
        "They note which research sources produced the strongest facts this cycle.",
        "They archive the raw version so historical context remains accessible.",
        "They schedule the next refresh date to prevent the list from going stale.",
    ]
    counter = itertools.count(1)
    for intention, workspace, action, reminder, endnote in itertools.zip_longest(
        itertools.cycle(intentions),
        itertools.cycle(workspaces),
        itertools.cycle(refinement_actions),
        itertools.cycle(reminders),
        itertools.cycle(endnotes),
    ):
        idx = next(counter)
        text = (
            f"Data Prep Workshop Entry {idx}: The team gathers to {intention} inside {workspace}. "
            f"They {action}, pausing to celebrate how the clean AuthorityPoint aesthetic awaits them in the next chapter. "
            f"Everyone repeats that {reminder}, so no column is left ambiguous. "
            f"{endnote}"
        )
        yield make_wrapped(text)


def wizard_generator():
    prep_states = [
        "after a dataset polish",
        "with credits freshly topped up",
        "following a stakeholder rehearsal",
        "between customer calls",
        "during a late-night campaign sprint",
        "as part of a weekend hackathon",
        "after onboarding a new operator",
        "before presenting to leadership",
    ]
    entry_actions = [
        "drag a CSV into the glowing drop zone",
        "click Browse and select the latest XLSX",
        "replace an outdated file with a refreshed version",
        "upload a test batch to confirm formatting",
        "toggle between dark and light browser themes to check contrast",
        "zoom the page to confirm accessibility cues remain intact",
        "invite a teammate to co-review the summary card",
        "copy the temporary file path into the runbook",
    ]
    email_mapping = [
        "the auto-selected email column matches the dataset plan",
        "manual overrides help target a different contact field",
        "the dropdown reminder clarifies only one email is used",
        "validation catches a blank header before it causes trouble",
        "the warning banner nudges them to refresh credits",
        "the animated stepper guides them to context entry",
        "the subtle microcopy reiterates privacy best practices",
        "the field description makes column choices unambiguous",
    ]
    context_focus = [
        "craft core offers that sound like polished campaign briefs",
        "fine-tune differentiators so the tone feels consultative",
        "draft CTAs with specific timeframes and outcomes",
        "align timelines with upcoming product launches",
        "ensure goals map to CRM stages",
        "write fallback actions that keep conversations moving",
        "capture persona-specific nuances for every segment",
        "paste approved language straight from the messaging doc",
    ]
    preview_results = [
        "stakeholders clap when the preview line nails the conference shout-out",
        "sales reps record Loom reactions to the tailored messaging",
        "the preview shows the #4F55F1 accent hugging the CTA button",
        "the modal highlights how research flows into natural-sounding copy",
        "operators adjust context live until the preview matches their intent",
        "the team compares multiple samples to confirm tonal balance",
        "the preview becomes a slide in the enablement deck",
        "the QA lead signs off after seeing data and copy in harmony",
    ]
    wrapups = [
        "They document the run in the campaign tracker with job ID and dataset version.",
        "They screenshot the wizard stages for the onboarding library.",
        "They message finance confirming credits were consumed as planned.",
        "They schedule a follow-up preview session for a different segment.",
        "They paste the context fields into the playbook for reuse.",
        "They write a short retro capturing decisions made during the flow.",
        "They link the preview output in Slack to celebrate small wins.",
        "They mark the job as launched and head to the Files timeline for monitoring.",
    ]
    counter = itertools.count(1)
    for prep, entry, mapping, context, preview, wrapup in itertools.zip_longest(
        itertools.cycle(prep_states),
        itertools.cycle(entry_actions),
        itertools.cycle(email_mapping),
        itertools.cycle(context_focus),
        itertools.cycle(preview_results),
        itertools.cycle(wrapups),
    ):
        idx = next(counter)
        text = (
            f"Wizard Practice Journal {idx}: {prep}, the operator steps into Enrich to {entry}. "
            f"They confirm {mapping} before moving to the context grid where they {context}. "
            f"Preview time arrives and {preview}, proving the interactive design keeps training lively. "
            f"{wrapup}"
        )
        yield make_wrapped(text)


def timeline_generator():
    time_blocks = [
        "early morning status sweeps",
        "midday accountability check-ins",
        "afternoon syncs with sales",
        "pre-evening retros",
        "end-of-week audits",
        "weekend maintenance windows",
        "launch-day live monitoring",
        "post-event recaps",
    ]
    observations = [
        "progress bars breathe across the calm white cards",
        "status pills swap from lavender to charcoal as jobs complete",
        "group headings show Today, Yesterday, and specific dates",
        "Load more extends the view for long-running campaigns",
        "the detail panel slides in with job IDs and timestamps",
        "download buttons glow subtly on hover",
        "failure banners surface actionable error text",
        "the help button waits patiently at the panel's base",
    ]
    actions = [
        "download completed CSVs and archive them in shared folders",
        "copy job IDs into the campaign tracker",
        "tag teammates responsible for follow-up tasks",
        "note partial progress for in-flight batches",
        "compare throughput against daily goals",
        "capture screenshots for leadership briefings",
        "review error notes and route fixes to researchers",
        "schedule reruns for segments that need polishing",
    ]
    lessons = [
        "diligent monitoring keeps the outreach pipeline accountable",
        "visibility across the timeline calms busy launch weeks",
        "grouped entries make it easy to tell the campaign story",
        "micro-interactions ensure accessibility for keyboard users",
        "consistent color cues reveal job health instantly",
        "quick downloads shorten the gap between personalization and send",
        "detailed errors transform setbacks into process improvements",
        "shared logs help teams coordinate across time zones",
    ]
    follow_through = [
        "They post a recap of the timeline health in the daily standup channel.",
        "They mark jobs as handled in the internal tracker for transparency.",
        "They invite QA leads to review a specific batch before export.",
        "They flag repeated failures and propose dataset adjustments in the playbook.",
        "They celebrate throughput milestones with a shout-out to the ops pod.",
        "They align marketing on which exports are ready for sequencing.",
        "They share the download links with sales along with contextual notes.",
        "They log open questions for the weekly personalization sync.",
    ]
    counter = itertools.count(1)
    for block, observation, action, lesson, follow in itertools.zip_longest(
        itertools.cycle(time_blocks),
        itertools.cycle(observations),
        itertools.cycle(actions),
        itertools.cycle(lessons),
        itertools.cycle(follow_through),
    ):
        idx = next(counter)
        text = (
            f"Timeline Command Note {idx}: During {block}, operators observe how {observation}. "
            f"They {action}, all while the matte gray canvas and violet highlights keep signal from noise. "
            f"Everyone agrees that {lesson}, reinforcing the Files tab as mission control. "
            f"{follow}"
        )
        yield make_wrapped(text)


def output_generator():
    review_blocks = [
        "a morning QA blitz",
        "an afternoon enablement session",
        "a cross-functional retro",
        "a mentor-led coaching call",
        "a late-night polishing sprint",
        "a weekend workshop",
        "a campaign launch rehearsal",
        "an executive showcase",
    ]
    focal_points = [
        "the `sif_personalized` column that reads like a crafted opener",
        "the `sif_research` snippets that justify every compliment",
        "merge tags aligning with sequencing tools",
        "tone consistency across segments",
        "the interplay between research notes and CTA framing",
        "edits logged in the change tracking column",
        "response notes appended after outreach",
        "QA scores recorded alongside each row",
    ]
    collaborative_moves = [
        "score lines on a five-point rubric for accuracy and tone",
        "leave threaded comments tagging sales leaders for input",
        "compare high-performing lines with underperforming ones",
        "draft follow-up variations in adjacent columns",
        "highlight standout achievements worth mentioning in calls",
        "catalog manual edits for future dataset tweaks",
        "capture positive replies and link them to the originating line",
        "prepare trimmed CSVs tailored to each outreach platform",
    ]
    insights = [
        "personalization feels strongest when research is crisp and current",
        "QA discipline shortens the path from export to send",
        "collaboration keeps messaging on-brand across teams",
        "documented edits fuel better datasets next cycle",
        "response tracking reveals which angles drive meetings",
        "visual reviews make it easy to spot tonal drift",
        "shared libraries of winning lines inspire new campaigns",
        "structured workflows prevent the spreadsheet from becoming chaotic",
    ]
    wrapups = [
        "They update the personalization library with fresh examples and lessons learned.",
        "They sync with marketing to translate insights into nurture content.",
        "They brief leadership on campaign readiness using concrete stats.",
        "They archive the reviewed file in a folder labeled with job ID and segment.",
        "They schedule a follow-up QA to review additional rows as the job scales.",
        "They annotate edits in the playbook for future operators.",
        "They celebrate wins by sharing favorite lines in the team channel.",
        "They trigger the integration that pipes approved rows into the sequence platform.",
    ]
    counter = itertools.count(1)
    for block, focus, move, insight, wrap in itertools.zip_longest(
        itertools.cycle(review_blocks),
        itertools.cycle(focal_points),
        itertools.cycle(collaborative_moves),
        itertools.cycle(insights),
        itertools.cycle(wrapups),
    ):
        idx = next(counter)
        text = (
            f"Output Review Chronicle {idx}: During {block}, the team concentrates on {focus}. "
            f"They {move}, treating the exported CSV as a living collaboration surface bathed in AuthorityPoint's clean aesthetic. "
            f"Everyone acknowledges that {insight}, reinforcing the value of deliberate QA. "
            f"{wrap}"
        )
        yield make_wrapped(text)


def billing_generator():
    cadences = [
        "monthly finance reviews",
        "quarterly planning offsites",
        "annual budgeting cycles",
        "pre-launch readiness checks",
        "mid-campaign pulse meetings",
        "agency-client alignment calls",
        "board presentation rehearsals",
        "procurement onboarding sessions",
    ]
    focal_elements = [
        "the pricing cards with animated outlines",
        "the yearly toggle revealing savings",
        "the credit allotments listed per tier",
        "the CTA buttons that launch Stripe checkout",
        "the add-on pricing tooltips",
        "the enterprise contact panel",
        "the hero statement summarizing plan value",
        "the clean typography that mirrors the rest of the app",
    ]
    financial_moves = [
        "compare plan credits to projected outreach volume",
        "document per-credit costs for leadership",
        "capture screenshots for approval decks",
        "sync renewal dates with procurement systems",
        "draft add-on purchase justifications",
        "outline enterprise requirements before emailing the founders",
        "cross-reference billing data with ROI metrics",
        "update the finance knowledge base with current pricing",
    ]
    perspectives = [
        "transparency keeps budget conversations smooth",
        "consistent design reassures stakeholders",
        "annual savings drive strategic planning",
        "shared visibility prevents last-minute escalations",
        "add-on tracking proves resource stewardship",
        "enterprise pathways feel accessible yet premium",
        "finance appreciates when credit math is clear",
        "billing hygiene strengthens trust across teams",
    ]
    conclusions = [
        "They log the decisions in the billing dossier alongside renewal milestones.",
        "They message the rev-ops channel with the finalized plan notes.",
        "They schedule follow-up reminders for the next credit review.",
        "They update the personalization playbook with the new pricing context.",
        "They thank stakeholders for quick approvals, noting how the UI eased the conversation.",
        "They archive Stripe receipts in the finance folder with clear tags.",
        "They capture outstanding questions and assign owners before closing the modal.",
        "They align campaign pacing with the confirmed credit supply.",
    ]
    counter = itertools.count(1)
    for cadence, element, move, perspective, conclusion in itertools.zip_longest(
        itertools.cycle(cadences),
        itertools.cycle(focal_elements),
        itertools.cycle(financial_moves),
        itertools.cycle(perspectives),
        itertools.cycle(conclusions),
    ):
        idx = next(counter)
        text = (
            f"Billing Strategy Memo {idx}: During {cadence}, stakeholders review {element}. "
            f"They {move}, guided by the same #4F55F1 highlights that appear across the platform. "
            f"The conversation reinforces that {perspective}, making plan management feel collaborative. "
            f"{conclusion}"
        )
        yield make_wrapped(text)


def operations_generator():
    rhythms = [
        "weekly personalization councils",
        "monthly retrospectives",
        "quarterly roadmap summits",
        "daily asynchronous check-ins",
        "cross-team enablement clinics",
        "regional rollout planning",
        "campaign war-room standups",
        "executive alignment briefings",
    ]
    focus_items = [
        "playbook updates with fresh screenshots",
        "metrics dashboards tying jobs to pipeline",
        "dataset refresh calendars",
        "support channels listed in the avatar dropdown",
        "job failure retros with documented fixes",
        "training libraries filled with wizard recordings",
        "credit forecasts compared to booking targets",
        "celebration boards highlighting standout personalization wins",
    ]
    operational_moves = [
        "assign owners for upcoming uploads",
        "review QA scores and adjust thresholds",
        "sync on research coverage across regions",
        "escalate open support tickets when needed",
        "plan automation experiments to remove manual steps",
        "capture outcomes in shared meeting notes",
        "map each campaign to its corresponding job IDs",
        "collect testimonials from teams using the outputs",
    ]
    principles = [
        "documentation keeps the program resilient",
        "metrics tie personalization to revenue impact",
        "continuous training sustains quality",
        "clear escalation paths reduce downtime",
        "automation frees humans for strategy",
        "shared ownership keeps knowledge distributed",
        "celebrating wins fuels adoption",
        "iterative learning makes scaling smoother",
    ]
    finales = [
        "They publish the meeting summary in the guild workspace before the day ends.",
        "They refresh the help center bookmark list with any new chapters added.",
        "They coordinate with marketing to broadcast key updates company-wide.",
        "They log follow-up tasks in the project management board with due dates.",
        "They schedule the next review to keep momentum steady.",
        "They compile highlights for leadership, tying successes back to AuthorityPoint workflows.",
        "They check the help dropdown to ensure support links stay visible for newcomers.",
        "They capture reflections in the operations journal to inform future playbooks.",
    ]
    counter = itertools.count(1)
    for rhythm, focus, move, principle, finale in itertools.zip_longest(
        itertools.cycle(rhythms),
        itertools.cycle(focus_items),
        itertools.cycle(operational_moves),
        itertools.cycle(principles),
        itertools.cycle(finales),
    ):
        idx = next(counter)
        text = (
            f"Operations Continuity Report {idx}: During {rhythm}, leaders review {focus}. "
            f"They {move}, always referencing the help hub to keep processes aligned with the product experience. "
            f"The conversation reiterates that {principle}, proving AuthorityPoint is a dependable backbone for outreach. "
            f"{finale}"
        )
        yield make_wrapped(text)


# Chapter definitions omitted here for brevity in this snippet (they will follow the same structure as above).


chapters = [
    {
        "slug": "chapter-1-orientation",
        "title": "Chapter 1 – Getting Settled Inside AuthorityPoint",
        "hero": "Start strong by understanding the layout, navigation, and daily rhythms of the platform.",
        "duration": "30 minutes",
        "goal": "Sign in confidently, learn where critical controls live, and prepare your workspace for productive outreach.",
        "content": [
            make_wrapped(
                "AuthorityPoint greets you with a calm, Revolut-inspired canvas. Matte gray backgrounds frame white content surfaces, and the signature #4F55F1 accent guides your eyes without overwhelming the senses. Before touching any workflow button, pause on the login screen and appreciate the clarity: clean fields, instant validation, and the promise of a responsive loader ready to confirm your secure Supabase session."
            ),
            make_wrapped(
                "Once authenticated, the main layout slides into view. A fixed navigation rail hugs the left edge with icons for Home, Enrich, Files, and Billing. Hover interactions glow softly, reinforcing where each path will take you. A top strip anchors the page title, credit balance, and avatar dropdown. The color palette and spacing echo modern fintech interfaces, giving the entire experience a trustworthy tone."
            ),
            make_wrapped(
                "Spend a few minutes intentionally exploring these elements. Click Home to confirm dashboards load swiftly, then jump to Enrich to preview the upload wizard. Peek at Files to sense how completed jobs will appear later, and open Billing to understand how plan management feels. Orientation is about building muscle memory so every future session starts with confidence."
            ),
            make_wrapped(
                "Look closely at the avatar dropdown. Beyond logout, it holds quick access to Help, Settings, and credit purchases. Bookmark the Help link right away; this living manual mirrors the interface with plain-language guidance. Encourage teammates to follow the same habit so the entire organization shares a consistent reference."
            ),
            make_wrapped(
                "Before moving on, assemble the collateral you will eventually need—dataset templates, service context prompts, brand voice guides. AuthorityPoint rewards preparation, and onboarding is smoother when answers are ready. Consider building a shared document where teammates can paste the campaign differentiator, CTA, and fallback action so no one improvises under pressure."
            ),
        ],
        "scenarios": [
            {
                "title": "Onboard a new teammate in ten minutes",
                "description": "Walk a colleague through the core layout so they can work independently on day one.",
                "steps": [
                    "Send the teammate the login URL and confirm they can authenticate with their email.",
                    "Guide them through the navigation rail: Home, Enrich, Files, Billing.",
                    "Show the credits pill in the top strip and explain how it updates in real time.",
                    "Open the avatar dropdown to highlight the Help link and logout control.",
                    "Share your service context document so they are ready for the upload wizard.",
                ],
            },
            {
                "title": "Document your readiness checklist",
                "description": "Create a repeatable list that ensures you never start a session unprepared.",
                "steps": [
                    "Note the current credit balance from the top strip.",
                    "Open the Help dropdown and pin this manual in your browser.",
                    "Verify that your CSV template and service messaging are accessible.",
                    "Confirm that you can reach each navigation tab without errors.",
                    "Record the checklist in your team's knowledge base so others can reuse it.",
                ],
            },
        ],
        "checkpoints": [
            {
                "label": "Navigation mastered",
                "description": "You can describe the purpose of Home, Enrich, Files, and Billing without referencing notes.",
            },
            {
                "label": "Help bookmarked",
                "description": "The Help center is pinned in your browser or saved in your workspace resources.",
            },
            {
                "label": "Service context gathered",
                "description": "Core offer, differentiator, CTA, timeline, goal, and fallback action are ready for future uploads.",
            },
        ],
    },
    {
        "slug": "chapter-2-dashboard",
        "title": "Chapter 2 – Making the Dashboard Your Daily Briefing",
        "hero": "Read the Home page like an analyst so you always know where your account stands.",
        "duration": "35 minutes",
        "goal": "Interpret every data point on the dashboard and use it to drive confident decisions.",
        "content": [
            make_wrapped(
                "AuthorityPoint's Home page distills everything important into a focused column. At the top, a warm greeting confirms the workspace you are viewing, followed by an Account Overview card listing plan name, status, credits remaining, and renewal date. Each data point is framed in white space, making it easy to parse at a glance."
            ),
            make_wrapped(
                "Below the overview sits the action strip. Buttons for topping up credits or navigating to Billing carry the same violet glow as other CTAs. Use them proactively; the interface rewards early planning by keeping replenishment only a click away."
            ),
            make_wrapped(
                "Scroll further to find Recent Transactions—a ledger-style list that captures credit consumption and purchases. Each row pairs a concise description with a timestamp so you can trace activity in seconds. The consistent typography mirrors fintech statements, giving everyone confidence that the numbers are accurate."
            ),
            make_wrapped(
                "Treat the dashboard as a living briefing. Make it the first tab you open each morning, the final check before logging off, and the anchor for weekly reviews. When stakeholders ask about account health, sharing a screenshot of this page provides instant clarity."
            ),
            make_wrapped(
                "Finally, remember that the Home page inherits the same loader logic as every other module. If data takes a moment to appear, an inline spinner reassures you that the system is fetching updates. Patience is rewarded with precise metrics and the calm design AuthorityPoint is known for."
            ),
        ],
        "scenarios": [
            {
                "title": "Audit a week's worth of credit usage",
                "description": "Use the Recent Transactions ledger to reconcile campaign activity with your team's uploads.",
                "steps": [
                    "Open the Home page and scroll to the Recent Transactions section.",
                    "List each debit entry from the past seven days and note the associated job names.",
                    "Compare the timestamps with the jobs shown on the Files tab to confirm ownership.",
                    "Identify any unexpected deductions and follow up with the uploader if necessary.",
                    "Capture the summary in your operations log for future reference.",
                ],
            },
            {
                "title": "Plan a refill before a campaign surge",
                "description": "Ensure credits and subscription status support your upcoming workload.",
                "steps": [
                    "Check the credits remaining value on the Account Overview card.",
                    "Estimate how many rows your upcoming uploads will require.",
                    "If the projected usage exceeds your balance, click the buy credits button or schedule a plan upgrade in Billing.",
                    "Verify that your subscription status is active to avoid processing delays.",
                    "Share the plan with stakeholders so everyone knows the account is ready.",
                ],
            },
        ],
        "checkpoints": [
            {
                "label": "Metrics interpreted",
                "description": "You can explain what plan, status, credits, and renewal date represent in practical terms.",
            },
            {
                "label": "Ledger reviewed",
                "description": "Recent Transactions are checked at least weekly to ensure credit usage aligns with expectations.",
            },
            {
                "label": "Refill strategy",
                "description": "You have a playbook for topping up credits or adjusting plans before running out.",
            },
        ],
    },
    {
        "slug": "chapter-3-data-prep",
        "title": "Chapter 3 – Engineering Prospect Data for Precision",
        "hero": "Prepare spreadsheets that pair perfectly with AuthorityPoint's upload wizard.",
        "duration": "45 minutes",
        "goal": "Create, cleanse, and segment datasets that streamline every step of the Enrich flow.",
        "content": [
            make_wrapped(
                "Every successful personalization job begins with a disciplined dataset. AuthorityPoint thrives on clarity—clean headers, specific key facts, and segmentation tags that match your campaigns. This chapter teaches you how to transform raw spreadsheets into wizard-ready assets."
            ),
            make_wrapped(
                "Start by defining the objective of the list. Are you targeting expansion customers, investors, or partners? Write that goal at the top of your sheet and share it with contributors. Context keeps research aligned and prevents off-brand messaging."
            ),
            make_wrapped(
                "Next, lock in column standards. Use lowercase_with_underscores for headers, dedicate a single column to email, and reserve space for `key_fact`, `supporting_fact`, and `segment`. If you collaborate with freelancers, give them a template so every file arrives consistent."
            ),
            make_wrapped(
                "Cleanliness matters. Remove duplicates, validate emails, trim whitespace, and cross-check facts for recency. AuthorityPoint's wizard will reward your diligence with seamless parsing and accurate previews."
            ),
            make_wrapped(
                "Finally, document everything. Maintain a changelog describing edits, note data sources for compliance, and attach campaign briefs outlining service context answers. Preparation here reduces friction in every later stage."
            ),
        ],
        "scenarios": [
            {
                "title": "Create a reusable research template",
                "description": "Design a spreadsheet that any teammate can populate without clarification.",
                "steps": [
                    "List required headers (`first_name`, `last_name`, `title`, `company`, `email`, `website`, `linkedin`, `key_fact`).",
                    "Add optional columns for segmentation or supporting facts as needed.",
                    "Include notes reminding researchers to capture recent, verifiable achievements.",
                    "Store the template in your shared drive so every contributor starts from the same blueprint.",
                    "Review completed files against the template before accepting them.",
                ],
            },
            {
                "title": "Quality-check a dataset before upload",
                "description": "Run a structured audit so the Enrich wizard receives pristine data.",
                "steps": [
                    "Sort by email and remove duplicates or blanks.",
                    "Spot-check a handful of URLs to confirm they lead to official company domains.",
                    "Read several key facts aloud to ensure they are concise and specific.",
                    "Verify that every segment label matches your campaign plan.",
                    "Save a versioned copy of the cleaned file with the date embedded in the filename.",
                ],
            },
        ],
        "checkpoints": [
            {
                "label": "Template finalized",
                "description": "Your team uses a consistent spreadsheet format for all future uploads.",
            },
            {
                "label": "Facts verified",
                "description": "Every key fact has been checked for accuracy and recency before upload.",
            },
            {
                "label": "Brief prepared",
                "description": "Service context instructions (offer, differentiator, CTA, timeline, goal, fallback) are documented alongside the dataset.",
            },
        ],
    },
    {
        "slug": "chapter-4-upload-flow",
        "title": "Chapter 4 – Mastering the Enrich Wizard",
        "hero": "From drag-and-drop to job launch, learn every interaction of the upload experience.",
        "duration": "45 minutes",
        "goal": "Confidently move through the three-step wizard, preview outputs, and launch jobs without errors.",
        "content": [
            make_wrapped(
                "The Enrich wizard is AuthorityPoint's crown jewel. A pill-shaped step tracker sits at the top, guiding you through Upload, Email, and Context. Each stage occupies a spacious white card, surrounded by matte gray margins that keep focus centered."
            ),
            make_wrapped(
                "Begin by dropping your file into the glowing zone. An overlay appears, the violet loader spins, and a summary card confirms file name, size, and row count. If credits are low, a friendly warning offers quick access to Billing or a balance refresh."
            ),
            make_wrapped(
                "In the Email step, select the correct column. The dropdown respects your headers, and validation catches missteps before they become blockers."
            ),
            make_wrapped(
                "Context brings the workflow to life. Six textareas invite you to describe your offer, differentiator, CTA, timeline, goal, and fallback action. Hover tooltips share examples, ensuring every operator understands what excellent context looks like."
            ),
            make_wrapped(
                "Before launching, use the preview modal. Generate sample lines, share them with stakeholders, and iterate until the tone feels perfect. When you click Launch job, a toast confirms success and AuthorityPoint ushers you to the Files timeline automatically."
            ),
        ],
        "scenarios": [
            {
                "title": "Recover from a credit shortfall",
                "description": "Handle insufficient credits without abandoning your upload.",
                "steps": [
                    "Notice the warning in the upload step indicating how many credits you are missing.",
                    "Click the Buy credits button to open Billing in a new tab and complete a purchase.",
                    "Return to the wizard and press \"I've added credits\" to refresh the balance.",
                    "Confirm that the warning disappears and continue to the Email step.",
                    "Proceed with context entry and launch the job once everything is funded.",
                ],
            },
            {
                "title": "Use preview to secure stakeholder approval",
                "description": "Generate a sample email before committing to a full personalization run.",
                "steps": [
                    "Complete the service context fields with your intended messaging.",
                    "Open the preview panel and request the list of sample emails.",
                    "Select one prospect and click Generate preview to create a personalized email body.",
                    "Share the preview with stakeholders for feedback.",
                    "Incorporate any edits into the service context before launching the job.",
                ],
            },
        ],
        "checkpoints": [
            {
                "label": "File uploaded",
                "description": "Your dataset passes the parsing step and displays the correct row count and credit estimate.",
            },
            {
                "label": "Email mapped",
                "description": "The correct email column is selected, and the wizard shows no validation errors.",
            },
            {
                "label": "Context confirmed",
                "description": "Service fields reflect your campaign strategy, and you have optionally generated a preview.",
            },
        ],
    },
    {
        "slug": "chapter-5-job-tracking",
        "title": "Chapter 5 – Commanding the Files Timeline",
        "hero": "Monitor progress, download results, and keep every personalization job accountable.",
        "duration": "40 minutes",
        "goal": "Use the Files tab as mission control for all jobs from launch to completion.",
        "content": [
            make_wrapped(
                "The Files timeline presents every job as a polished card. Group headers organize entries by day, progress bars animate gently, and status pills announce whether a job is running, complete, or needs attention."
            ),
            make_wrapped(
                "Click any job to open a detail panel from the right. Inside you will find timestamps, row counts, job IDs, and download buttons. Failed jobs display clear error messages with guidance on how to resolve them."
            ),
            make_wrapped(
                "Use Load more to review historical campaigns, or focus on Today and Yesterday when managing active work. The interface mirrors the calm minimalism seen elsewhere in AuthorityPoint, making high-velocity weeks feel manageable."
            ),
            make_wrapped(
                "Treat the Files tab as a daily ritual. Download completed exports promptly, assign owners for reruns, and record insights in your operations tracker."
            ),
            make_wrapped(
                "Finally, remember the help button within the detail panel. It routes you to support resources when you need them, keeping the entire workflow connected."
            ),
        ],
        "scenarios": [
            {
                "title": "Daily job review ritual",
                "description": "Spend five minutes each morning ensuring every job is accounted for.",
                "steps": [
                    "Open the Files tab and expand each group labeled Today or Yesterday.",
                    "Download completed jobs and move the files to your outreach workspace.",
                    "Open any failed job, read the error message, and assign a fix to the appropriate teammate.",
                    "Use the Load more button if you need to revisit older campaigns for context.",
                    "Close the detail panel once you have verified there are no outstanding issues.",
                ],
            },
            {
                "title": "Investigate a stalled job",
                "description": "Diagnose and resolve a job that appears stuck in progress.",
                "steps": [
                    "Watch the progress bar and note the last percentage update.",
                    "Click the row to open the detail panel and confirm the status message.",
                    "If progress has not moved for several minutes, download any partial error logs if available or contact support via the Get help button.",
                    "Consider duplicating the job with a smaller test segment to rule out data issues.",
                    "Document the findings in your team channel so everyone stays informed.",
                ],
            },
        ],
        "checkpoints": [
            {
                "label": "Timeline monitored",
                "description": "You check the Files tab regularly and can explain the status of each job currently visible.",
            },
            {
                "label": "Downloads organized",
                "description": "Completed jobs are downloaded promptly and stored in an accessible location for outreach.",
            },
            {
                "label": "Failures resolved",
                "description": "Any job displaying a failure status has a documented remediation plan or has been rerun successfully.",
            },
        ],
    },
    {
        "slug": "chapter-6-output-review",
        "title": "Chapter 6 – Evaluating and Deploying Personalized Output",
        "hero": "Turn CSV downloads into campaign-ready messaging with a structured review process.",
        "duration": "45 minutes",
        "goal": "Inspect generated lines, collaborate with stakeholders, and integrate results into your outreach stack.",
        "content": [
            make_wrapped(
                "When a job finishes, the exported CSV becomes your canvas. AuthorityPoint preserves your original columns and adds `sif_research` plus `sif_personalized`. These fields unlock the story behind every line and the copy you will send to prospects."
            ),
            make_wrapped(
                "Start by sampling lines aloud. Listen for accuracy, tone, and specificity. Compare strong examples to weaker ones and trace differences back to the dataset or service context."
            ),
            make_wrapped(
                "Next, collaborate. Invite sales, marketing, and operations into the file. Use comments or dedicated columns to capture feedback, QA scores, and manual edits."
            ),
            make_wrapped(
                "Once approved, trim the sheet to include only the columns required by your sequencing platform. Rename fields to match merge tags and document the mapping for future runs."
            ),
            make_wrapped(
                "Finally, track outcomes. Create columns for responses or meetings booked. Feed those insights back into dataset research and context writing so each campaign improves the next."
            ),
        ],
        "scenarios": [
            {
                "title": "Run a 10% QA sweep",
                "description": "Sample a subset of rows to ensure personalization quality before handoff.",
                "steps": [
                    "Sort or filter the exported sheet to include a representative mix of segments.",
                    "Review at least 10% of rows, scoring each for relevance, tone, and accuracy.",
                    "Document scores in a separate QA tracker and calculate the average.",
                    "Flag any lines below your threshold with comments for follow-up.",
                    "Decide whether to proceed, tweak service instructions, or rerun the job.",
                ],
            },
            {
                "title": "Collaborate with sales on final messaging",
                "description": "Gather stakeholder buy-in without leaving the spreadsheet.",
                "steps": [
                    "Share the exported file with sales leaders using view + comment permissions.",
                    "Highlight a handful of standout lines and explain why they work.",
                    "Ask stakeholders to leave comments on any lines that need tonal adjustments.",
                    "Incorporate approved edits into the sheet and note them in your feedback log.",
                    "Export a cleaned CSV for upload into your outreach platform once everyone signs off.",
                ],
            },
        ],
        "checkpoints": [
            {
                "label": "Columns understood",
                "description": "You can explain the purpose of `sif_research` and `sif_personalized` to any stakeholder.",
            },
            {
                "label": "QA completed",
                "description": "A sampling process is documented and used on every job before distribution.",
            },
            {
                "label": "Feedback loop active",
                "description": "Insights from outreach teams are recorded and inform updates to datasets and instructions.",
            },
        ],
    },
    {
        "slug": "chapter-7-billing",
        "title": "Chapter 7 – Steering Plans, Credits, and Billing",
        "hero": "Align your subscription with campaign demand using the full power of the Billing workspace.",
        "duration": "35 minutes",
        "goal": "Understand pricing tiers, manage billing cycles, and know when to engage the enterprise team.",
        "content": [
            make_wrapped(
                "AuthorityPoint treats billing with the same polish as the rest of the product. Opening the Billing icon reveals a full-screen modal, dimming the background while the pricing grid glows at the center."
            ),
            make_wrapped(
                "A hero statement, 'Prices at a glance,' anchors the view. A toggle invites you to save with yearly billing, animating prices smoothly to display annual savings."
            ),
            make_wrapped(
                "Plan cards for Starter, Growth, and Pro feature rounded corners, animated outlines, and clear credit allotments. Tooltips explain add-on pricing, and CTA buttons launch Stripe checkout in seconds."
            ),
            make_wrapped(
                "An enterprise card highlights bespoke benefits—unlimited credits, priority queueing, CRM integrations, founder-led onboarding. Clicking Talk to us opens an email to the founders, ensuring white-glove support."
            ),
            make_wrapped(
                "Use this modal to plan proactively. Compare credits to campaign forecasts, gather approvals with annotated screenshots, and document decisions in your billing dossier."
            ),
        ],
        "scenarios": [
            {
                "title": "Upgrade with confidence",
                "description": "Walk stakeholders through the plan selection before initiating checkout.",
                "steps": [
                    "Open the Billing modal and toggle between monthly and yearly pricing to showcase savings.",
                    "Highlight the plan you intend to purchase so the animated outline appears.",
                    "Review included credits and add-on pricing using the feature list and tooltips.",
                    "Capture a screenshot for decision makers, then click the CTA to launch Stripe checkout.",
                    "Verify on the Home page that credits updated after payment.",
                ],
            },
            {
                "title": "Initiate an enterprise conversation",
                "description": "Use the built-in contact channel to explore bespoke arrangements.",
                "steps": [
                    "Scroll to the Enterprise section and review the feature list to ensure it matches your needs.",
                    "Click the Talk to us button to open an email addressed to the founders.",
                    "Outline your monthly job volume, team size, and any compliance requirements in the message.",
                    "Send the email and prepare any supporting documents (usage reports, procurement forms).",
                    "Track the conversation in your internal systems so stakeholders stay informed.",
                ],
            },
        ],
        "checkpoints": [
            {
                "label": "Cycle evaluated",
                "description": "You have compared monthly and yearly pricing and chosen the cadence that fits your forecast.",
            },
            {
                "label": "Plan alignment",
                "description": "Your current plan's credit allotment matches projected campaign volume.",
            },
            {
                "label": "Enterprise path noted",
                "description": "You know how to contact the founders if your organization requires a bespoke agreement.",
            },
        ],
    },
    {
        "slug": "chapter-8-operations",
        "title": "Chapter 8 – Sustaining Momentum and Scaling Success",
        "hero": "Embed AuthorityPoint into your operating rhythm so personalization stays sharp as you grow.",
        "duration": "40 minutes",
        "goal": "Build repeatable cadences, measure outcomes, and know how to get help when you need it.",
        "content": [
            make_wrapped(
                "With orientation, dashboards, data prep, uploads, tracking, review, and billing mastered, the final frontier is ongoing operations. This chapter shows how to embed AuthorityPoint into your weekly rhythms so personalization remains a competitive advantage."
            ),
            make_wrapped(
                "Start with a weekly personalization sync. Review dashboard metrics, active jobs, upcoming datasets, and support needs. Assign owners for each task and log notes in a shared playbook."
            ),
            make_wrapped(
                "Maintain documentation relentlessly. Update your playbook whenever messaging evolves, datasets change, or QA rubrics improve. Link to this help center chapter for quick refresher loops."
            ),
            make_wrapped(
                "Track outcomes with rigor. Map reply rates, meetings booked, and pipeline influence back to specific job IDs. Use these insights to refine dataset criteria and justify budget expansions."
            ),
            make_wrapped(
                "Plan for edge cases. Document escalation paths for job failures, dataset quality concerns, and billing questions. When everyone knows where to turn, stress stays low even during busy seasons."
            ),
        ],
        "scenarios": [
            {
                "title": "Host a weekly personalization sync",
                "description": "Create a standing meeting that keeps operations, marketing, and sales aligned.",
                "steps": [
                    "Review credits, ledger entries, and renewal dates from the Home page.",
                    "Inspect the Files timeline for outstanding jobs or failures.",
                    "Discuss upcoming datasets and assign research or QA owners.",
                    "Capture decisions and updates in your personalization playbook.",
                    "Identify any help or support needs and log follow-up actions.",
                ],
            },
            {
                "title": "Roll out a new campaign template",
                "description": "Use the playbook and help center to launch a fresh use case without friction.",
                "steps": [
                    "Document the new campaign's objective, tone, and key facts in your playbook.",
                    "Update the dataset template with any additional columns required.",
                    "Run a pilot job with a small segment and perform an intensive QA review.",
                    "Share results with stakeholders, gather feedback, and refine instructions.",
                    "Scale the campaign once everyone signs off, updating the playbook with lessons learned.",
                ],
            },
        ],
        "checkpoints": [
            {
                "label": "Documentation alive",
                "description": "Your personalization playbook is updated frequently and referenced by the team.",
            },
            {
                "label": "KPIs monitored",
                "description": "Reply rates, meetings, or other outcomes are tied back to specific AuthorityPoint jobs.",
            },
            {
                "label": "Support ready",
                "description": "Everyone knows how to access the Help center, contact support, and escalate billing questions.",
            },
        ],
    },
]


def ensure_lengths():
    generators = [
        orientation_generator(),
        dashboard_generator(),
        dataprep_generator(),
        wizard_generator(),
        timeline_generator(),
        output_generator(),
        billing_generator(),
        operations_generator(),
    ]
    for chapter, generator in zip(chapters, generators):
        extend_with_generator(chapter["content"], generator)
        total = word_count(chapter["content"])
        if total < TARGET_WORDS:
            raise ValueError(f"{chapter['title']} has only {total} words")


def write_typescript():
    output_path = Path("outreach-frontend/data/helpContent.ts")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        f.write("export interface HelpScenario {\n  title: string;\n  description: string;\n  steps: string[];\n}\n\n")
        f.write("export interface HelpCheckpoint {\n  label: string;\n  description: string;\n}\n\n")
        f.write(
            "export interface HelpChapter {\n  slug: string;\n  title: string;\n  hero: string;\n  duration: string;\n  goal: string;\n  content: string[];\n  scenarios: HelpScenario[];\n  checkpoints: HelpCheckpoint[];\n}\n\n"
        )
        f.write("export const helpChapters: HelpChapter[] = ")
        json.dump(chapters, f, indent=2, ensure_ascii=False)
        f.write(";\n")


if __name__ == "__main__":
    ensure_lengths()
    write_typescript()
