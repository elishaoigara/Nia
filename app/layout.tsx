import React from 'react';
import './globals.css';

const Layout = () => {
  return (
    <div className='layout'
      <header className='header'
        <nav className='nav'
          <ul>
            <li><a href='#'>Home</a></li>
            <li><a href='#'>About</a></li>
            <li><a href='#'>Contact</a></li>
          </ul>
        </nav>
      </header>
      <main className='main'
        {/* Page content */}
      </main>
      <footer className='footer'
        {/* Footer content */}
      </footer>
    </div>
  );
};

export default Layout;