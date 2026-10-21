# PROMPTS.md

Planning was done in a Claude chat before any code was written. The result is `docs/SPEC.md`.
The prompts were written in Turkish and are translated here. After downloading SPEC.md, continued in VSCode and I used mostly Claude Code.

I provided the task by email in a structured way, then:

- lets begin the planning process right from the start requirements analysis and scope, you give me a list of your questions (about decisions that i need to make) and your suggestions (with your reasons). before moving on to architecture or API design, we need to clearly define in each step in roadmap. our roadmap is: Requirements analysis and scope -> architecture and technology decisions -> API contract -> frontend design -> testing strategy -> delivery decisions. Each answer you give must include best practices.
- rewrite this answer in a more organized way. then, if there are other decisions to make, show me.
- lets start architecture and technology decisions, show me the questions.
- lets move on to API contract.
- move on to frontend design.
- move on to testing
- move on to delivery decisions

Here I gave my SPEC list then,

- here is my SPEC list, rewrite this, check if there are gaps, ask me questions to address these gaps with your suggestions.

After answering some questions, acquired ultimate SPEC.md, then I wrote CLAUDE.md.

Here I created CLAUDE.md and docs/SPEC.md then started using Claude Code.

- Use a subagent to review this diff against spec.md. Report if there is gaps that affect correctness or the stated requirements.

After making some change, 

- Create a plan for implementation (plan mode)

Claude created plan, after revising it we started implementation step by step. I checked the code after every step.
We mostly changed frontend throughout development.



 