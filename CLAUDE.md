# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository is for a Fastmail sender categorization application. It provides an API to automatically categorize email senders by adding them to appropriate Fastmail contact groups via CardDAV.

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

- `src/` - Main application source code
  - `index.js` - Express API server with authentication
  - `carddav-client.js` - CardDAV client for Fastmail integration
  - `utils/validation.js` - Input validation utilities
- `fly.toml` - Fly.io deployment configuration
- `.env.example` - Environment variables template
- `Dockerfile` - Container configuration
- `package.json` - Node.js dependencies and scripts