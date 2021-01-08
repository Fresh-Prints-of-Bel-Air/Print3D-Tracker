import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { logout } from '../../actions/authActions';

export const Navbar = ({ user, logout }) => {
  // click event function for Logout link
  const onLogout = () => logout();
  return (
    <nav className='black'>
      <div className='nav-wrapper' style={{ position: 'fixed', width: '100%' }}>
        <ul id='nav-mobile' className='right hide-on-med-and-down'>
            { (localStorage.getItem("token") !== null) &&
              <li>
                <Link to='login' onClick={onLogout}>Logout</Link>
              </li>   
            }
          <li>
            <Link to='build-history'>Build History</Link>
            
          </li>
        </ul>
      </div>
    </nav>
  );
};

const mapStateToProps = (state) => ({
  user: state.user,
  logout: state.logout,

});

export default connect(mapStateToProps, { logout })(Navbar);