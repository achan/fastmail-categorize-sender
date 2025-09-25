# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo for a Fastmail sender categorization application consisting of two components:
1. An Apple shortcut that can be used from a share sheet
2. An API that the shortcut will hit to automatically categorize email senders by adding them to appropriate Fastmail contact groups via CardDAV

## Node.js Version

- **Required Node.js version**: 22 (specified in `.node-version`)
- Use `nvm use` or similar Node version manager to ensure correct version

## Initial Setup

Since this is a new project, common initialization steps may include:

- `npm init` - Initialize package.json
- Install development dependencies (TypeScript, testing framework, linters)
- Set up project structure for a contacts application

## Development Notes

This is a Node.js API for categorizing email senders by managing Fastmail contact groups via CardDAV. When developing:

- Follow Node.js 22 compatibility requirements
- Use CardDAV protocol for Fastmail integration
- Support for known contact groups: Paper Trail, Feed, Firehose
- Bearer token authentication required for all API endpoints
- Direct UID-based contact and group access for better performance

## Project Structure

- `api/` - Node.js API server
  - `src/` - Main application source code
    - `index.js` - Express API server with authentication
    - `carddav-client.js` - CardDAV client for Fastmail integration
  - `fly.toml` - Fly.io deployment configuration
  - `.env.example` - Environment variables template
  - `Dockerfile` - Container configuration
  - `package.json` - Node.js dependencies and scripts
- `shortcut/` - Apple shortcut component (to be added)