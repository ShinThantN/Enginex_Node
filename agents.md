## Project overview

- Freelancing web app for engineers
- Core goal: To increase the employment rate of engineers and to serve an easy way to find contracts for clients

## Tech Stacks

- ExpressJS, Prisma, Jest, Zod
- Do Not introduce: Any other testing libraries other than jest wthout approval

## Core Commands

- dev : "npm run dev"
- test : "npm run test"

## Features Overview

- Three types of users: engineers, clients and teams
- Functions of clients: Make direct project requests to engineers or teams, post project listings on feed, search engineers and teams, rate engineers / teams after each successful project, report specific engineers/teams of superadmin
- Functions of engineers: Accept/decline direct project requests, Offer to build the project listings,post various posts on feed, accept contract requests from teams, rate clients after each successful projects
- Functions of teams: Every function of engineer, form contract with engineers
- Functions of admin: Review the reports from individual users

## Architecture

- The api endpoints must be included inside /api/
- Routing must be done in order of index.ts -> routes/index.ts -> routes of individual modules
- Shared configs and middlewares must be placed inside src/shared
- Prisma client must only be defined inside src/shared/config/prisma.ts . No more importing of prisma client other than that file
- Shared types must be inside src/types
