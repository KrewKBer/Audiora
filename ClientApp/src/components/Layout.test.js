import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { Layout } from './Layout';

// Mock NavMenu
jest.mock('./NavMenu', () => ({
  NavMenu: () => <div data-testid="nav-menu">NavMenu</div>
}));

describe('Layout Component', () => {
  test('renders navigation menu', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    expect(screen.getByTestId('nav-menu')).toBeInTheDocument();
  });

  test('renders children content', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('renders multiple children', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>First Child</div>
          <div>Second Child</div>
        </Layout>
      </BrowserRouter>
    );

    expect(screen.getByText('First Child')).toBeInTheDocument();
    expect(screen.getByText('Second Child')).toBeInTheDocument();
  });

  test('has correct structure with Container', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('container');
  });

  test('applies correct styling', () => {
    const { container } = render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    );

    const mainWrapper = container.firstChild;
    expect(mainWrapper).toHaveStyle({ position: 'relative', minHeight: '100vh' });
  });
});
