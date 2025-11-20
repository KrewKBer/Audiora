import React from 'react';
import '@testing-library/jest-dom';
import AppRoutes from './AppRoutes';

describe('AppRoutes Configuration', () => {
  test('exports an array of routes', () => {
    expect(Array.isArray(AppRoutes)).toBe(true);
    expect(AppRoutes.length).toBeGreaterThan(0);
  });

  test('includes login route', () => {
    const loginRoute = AppRoutes.find(route => route.path === '/login');
    expect(loginRoute).toBeDefined();
    expect(loginRoute.element).toBeDefined();
  });

  test('includes register route', () => {
    const registerRoute = AppRoutes.find(route => route.path === '/register');
    expect(registerRoute).toBeDefined();
    expect(registerRoute.element).toBeDefined();
  });

  test('includes search route', () => {
    const searchRoute = AppRoutes.find(route => route.path === '/search');
    expect(searchRoute).toBeDefined();
    expect(searchRoute.element).toBeDefined();
  });

  test('includes root route with PrivateRoute', () => {
    const rootRoute = AppRoutes.find(route => route.path === '/');
    expect(rootRoute).toBeDefined();
    expect(rootRoute.element).toBeDefined();
  });

  test('root route has children routes', () => {
    const rootRoute = AppRoutes.find(route => route.path === '/');
    expect(rootRoute.children).toBeDefined();
    expect(Array.isArray(rootRoute.children)).toBe(true);
    expect(rootRoute.children.length).toBeGreaterThan(0);
  });

  test('includes home route as index', () => {
    const rootRoute = AppRoutes.find(route => route.path === '/');
    const homeRoute = rootRoute.children.find(child => child.index === true);
    expect(homeRoute).toBeDefined();
    expect(homeRoute.element).toBeDefined();
  });

  test('includes liked-songs route', () => {
    const rootRoute = AppRoutes.find(route => route.path === '/');
    const likedRoute = rootRoute.children.find(child => child.path === 'liked-songs');
    expect(likedRoute).toBeDefined();
  });

  test('includes profile route', () => {
    const rootRoute = AppRoutes.find(route => route.path === '/');
    const profileRoute = rootRoute.children.find(child => child.path === 'profile');
    expect(profileRoute).toBeDefined();
  });

  test('includes chats route', () => {
    const rootRoute = AppRoutes.find(route => route.path === '/');
    const chatsRoute = rootRoute.children.find(child => child.path === 'chats');
    expect(chatsRoute).toBeDefined();
  });

  test('includes matchmaking route', () => {
    const rootRoute = AppRoutes.find(route => route.path === '/');
    const matchmakingRoute = rootRoute.children.find(child => child.path === 'matchmaking');
    expect(matchmakingRoute).toBeDefined();
  });

  test('includes directchat route with parameter', () => {
    const rootRoute = AppRoutes.find(route => route.path === '/');
    const directchatRoute = rootRoute.children.find(child => child.path === 'directchat/:chatId');
    expect(directchatRoute).toBeDefined();
  });
});
