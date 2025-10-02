import React, { Component } from 'react';
import { Container } from 'reactstrap';
import { NavMenu } from './NavMenu';

export class Layout extends Component {
  static displayName = Layout.name;

  render() {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <NavMenu />
        <Container tag="main" style={{ position: 'relative', zIndex: 1 }}>
          {this.props.children}
        </Container>
      </div>
    );
  }
}
