// // components/common/Sidebar.jsx - Updated with Authentication

// import React, { useState } from 'react';
// import { 
//   MdMenu, 
//   MdClose, 
//   MdDashboard, 
//   MdShoppingCart, 
//   MdPeople, 
//   MdTaskAlt, 
//   MdAssignment, 
//   MdExpandMore, 
//   MdChevronRight,
//   MdLogout,
//   MdPerson,
//   MdSettings
// } from 'react-icons/md';

// const AdminSidebar = ({ 
//   isOpen, 
//   onToggle, 
//   currentPage, 
//   onNavigate, 
//   onLogout, 
//   isDarkMode, 
//   currentUser 
// }) => {
//   const [expandedMenus, setExpandedMenus] = useState({});
//   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

//   const menuItems = [
//     { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, submenu: [] },
//     { id: 'categories', label: 'Product Service Categories', icon: MdShoppingCart, submenu: [] },
//     { id: 'users', label: 'User Management', icon: MdPeople, submenu: [] },
//     { id: 'tasks', label: 'Task Management', icon: MdTaskAlt, submenu: [] },
//     { id: 'user-dependency', label: 'User Dependency', icon: MdAssignment, submenu: [] },
//     { id: 'task-dependency', label: 'Task Dependency', icon: MdAssignment, submenu: [] },
//   ];

//   const toggleSubmenu = (id) => {
//     setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
//   };

//   const handleMenuClick = (id) => {
//     onNavigate(id);
//     if (window.innerWidth < 1024) {
//       onToggle();
//     }
//   };

//   const handleLogout = () => {
//     setShowLogoutConfirm(false);
//     if (onLogout) {
//       onLogout();
//     }
//   };

//   return (
//     <>
//       {/* Overlay */}
//       {isOpen && (
//         <div
//           className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
//           onClick={onToggle}
//         ></div>
//       )}

//       {/* Sidebar */}
//       <div
//         className={`fixed left-0 top-0 h-full w-64 transform transition-transform duration-300 z-50 lg:z-10 lg:translate-x-0 overflow-y-auto flex flex-col ${
//           isOpen ? 'translate-x-0' : '-translate-x-full'
//         } ${isDarkMode ? 'bg-gradient-to-b from-slate-900 to-slate-800' : 'bg-white border-r border-slate-200'}`}
//       >
//         {/* Header */}
//         <div className={`p-6 border-b sticky top-0 z-10 ${
//           isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
//         }`}>
//           <div className="flex justify-between items-start mb-4">
//             <div className="flex items-start gap-3">
//               {/* User Avatar */}
//               <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
//                 isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
//               }`}>
//                 <span className="text-white font-semibold text-lg">
//                   {currentUser?.name?.charAt(0) || 'A'}
//                 </span>
//               </div>
//               <div>
//                 <h2 className={`text-lg font-bold ${
//                   isDarkMode ? 'text-white' : 'text-slate-900'
//                 }`}>
//                   {currentUser?.name || 'Admin'}
//                 </h2>
//                 <p className={`text-xs mt-0.5 ${
//                   isDarkMode ? 'text-slate-400' : 'text-slate-600'
//                 }`}>
//                   {currentUser?.role || 'System User'}
//                 </p>
//               </div>
//             </div>
//             <button
//               onClick={onToggle}
//               className={`lg:hidden ${
//                 isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
//               }`}
//             >
//               <MdClose size={20} />
//             </button>
//           </div>
//           <p className={`text-sm font-medium ${
//             isDarkMode ? 'text-slate-300' : 'text-slate-700'
//           }`}>
//             Task Management System
//           </p>
//         </div>

//         {/* Menu Items */}
//         <div className="flex-1 p-4 space-y-2">
//           {menuItems.map(item => {
//             const IconComponent = item.icon;
//             const isActive = currentPage === item.id;
//             const hasSubmenu = item.submenu.length > 0;
//             const isExpanded = expandedMenus[item.id];

//             return (
//               <div key={item.id}>
//                 <button
//                   onClick={() => {
//                     if (hasSubmenu) {
//                       toggleSubmenu(item.id);
//                     } else {
//                       handleMenuClick(item.id);
//                     }
//                   }}
//                   className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
//                     isActive
//                       ? 'bg-blue-600 text-white shadow-lg'
//                       : isDarkMode
//                       ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
//                       : 'text-slate-700 hover:bg-slate-100'
//                   }`}
//                 >
//                   <IconComponent size={20} />
//                   <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
//                   {hasSubmenu && (
//                     isExpanded ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />
//                   )}
//                 </button>

//                 {/* Submenu */}
//                 {hasSubmenu && isExpanded && (
//                   <div className={`ml-4 mt-1 space-y-1 border-l pl-3 ${
//                     isDarkMode ? 'border-slate-700' : 'border-slate-300'
//                   }`}>
//                     {item.submenu.map(subitem => (
//                       <button
//                         key={subitem.id}
//                         onClick={() => handleMenuClick(subitem.id)}
//                         className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${
//                           currentPage === subitem.id
//                             ? 'bg-blue-500 text-white'
//                             : isDarkMode
//                             ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
//                             : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
//                         }`}
//                       >
//                         {subitem.label}
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>

//         {/* Bottom Section - Settings & Logout */}
//         <div className={`p-4 border-t space-y-2 ${
//           isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
//         }`}>
//           {/* Settings Button */}
//           <button
//             onClick={() => handleMenuClick('settings')}
//             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
//               currentPage === 'settings'
//                 ? 'bg-blue-600 text-white'
//                 : isDarkMode
//                 ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
//                 : 'text-slate-700 hover:bg-slate-100'
//             }`}
//           >
//             <MdSettings size={20} />
//             <span className="flex-1 text-left text-sm font-medium">Settings</span>
//           </button>

//           {/* Logout Button */}
//           <button
//             onClick={() => setShowLogoutConfirm(true)}
//             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
//               isDarkMode
//                 ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
//                 : 'text-red-600 hover:bg-red-50'
//             }`}
//           >
//             <MdLogout size={20} />
//             <span className="flex-1 text-left text-sm font-medium">Logout</span>
//           </button>
//         </div>
//       </div>

//       {/* Logout Confirmation Modal */}
//       {showLogoutConfirm && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
//           <div className={`w-full max-w-md rounded-xl shadow-2xl ${
//             isDarkMode ? 'bg-gray-800' : 'bg-white'
//           }`}>
//             {/* Modal Header */}
//             <div className={`px-6 py-4 border-b ${
//               isDarkMode ? 'border-gray-700' : 'border-gray-200'
//             }`}>
//               <h3 className={`text-lg font-semibold flex items-center gap-2 ${
//                 isDarkMode ? 'text-white' : 'text-gray-900'
//               }`}>
//                 <MdLogout size={24} className="text-red-500" />
//                 Confirm Logout
//               </h3>
//             </div>

//             {/* Modal Body */}
//             <div className="px-6 py-6">
//               <p className={`text-sm ${
//                 isDarkMode ? 'text-gray-300' : 'text-gray-700'
//               }`}>
//                 Are you sure you want to logout? Any unsaved changes will be lost.
//               </p>
              
//               {/* User Info */}
//               <div className={`mt-4 p-4 rounded-lg border ${
//                 isDarkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'
//               }`}>
//                 <div className="flex items-center gap-3">
//                   <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
//                     isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
//                   }`}>
//                     <span className="text-white font-medium">
//                       {currentUser?.name?.charAt(0) || 'A'}
//                     </span>
//                   </div>
//                   <div>
//                     <p className={`text-sm font-medium ${
//                       isDarkMode ? 'text-white' : 'text-gray-900'
//                     }`}>
//                       {currentUser?.name || 'Admin'}
//                     </p>
//                     <p className={`text-xs ${
//                       isDarkMode ? 'text-gray-400' : 'text-gray-600'
//                     }`}>
//                       {currentUser?.email || currentUser?.username || 'admin@system.com'}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Modal Footer */}
//             <div className={`px-6 py-4 border-t flex gap-3 justify-end ${
//               isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
//             }`}>
//               <button
//                 onClick={() => setShowLogoutConfirm(false)}
//                 className={`px-4 py-2 rounded-lg font-medium transition-colors ${
//                   isDarkMode
//                     ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//                     : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//                 }`}
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleLogout}
//                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
//               >
//                 <MdLogout size={18} />
//                 Logout
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default AdminSidebar;
// components/common/Sidebar.jsx - Updated with Worksheet Builder

import React, { useState } from 'react';
import { 
  MdMenu, 
  MdClose, 
  MdDashboard, 
  MdShoppingCart, 
  MdPeople, 
  MdTaskAlt, 
  MdAssignment, 
  MdExpandMore, 
  MdChevronRight,
  MdLogout,
  MdPerson,
  MdSettings,
  MdDocumentScanner,
  MdBook,
  MdCheckBox,
  MdAccountBalance,
  MdAssessment
} from 'react-icons/md';

const AdminSidebar = ({ 
  isOpen, 
  onToggle, 
  currentPage, 
  onNavigate, 
  onLogout, 
  isDarkMode, 
  currentUser 
}) => {
  const [expandedMenus, setExpandedMenus] = useState({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, submenu: [] },
    { id: 'categories', label: 'Category', icon: MdShoppingCart, submenu: [] },
    { id: 'users', label: 'User Management', icon: MdPeople, submenu: [] },
    { id: 'tasks', label: 'Task Management', icon: MdTaskAlt, submenu: [] },
    {
      id: 'workflows', 
      label: 'Task Dependency', 
      icon: MdAssignment, 
      submenu: [],
      badge: 'NEW'
    },
    { 
      id: 'worksheet-builder', 
      label: 'Worksheet Builder', 
      icon: MdDocumentScanner, 
      submenu: [],
      badge: 'NEW'
    },
    { 
      id: 'checklists', 
      label: 'Checklist Builder', 
      icon: MdCheckBox, 
      submenu: [],
    },
    { 
      id: 'guidelines', 
      label: 'Guidelines Builder', 
      icon: MdBook, 
      submenu: [],
      badge: 'NEW'
    },
    { 
      id: 'rate-manager', 
      label: 'Rate Manager', 
      icon: MdAccountBalance, 
      submenu: [],
      badge: 'NEW'
    },
    { 
      id: 'earnings-statement', 
      label: 'Earnings Statement', 
      icon: MdAssessment, 
      submenu: [],
      badge: 'NEW'
    },
  ];

  const toggleSubmenu = (id) => {
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMenuClick = (id) => {
    onNavigate(id);
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 transform transition-transform duration-300 z-50 lg:z-10 lg:translate-x-0 overflow-y-auto flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDarkMode ? 'bg-gradient-to-b from-slate-900 to-slate-800' : 'bg-white border-r border-slate-200'}`}
      >
        {/* Header */}
        <div className={`p-6 border-b sticky top-0 z-10 ${
          isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-3">
              {/* User Avatar */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
              }`}>
                <span className="text-white font-semibold text-lg">
                  {currentUser?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div>
                <h2 className={`text-lg font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {currentUser?.name || 'Admin'}
                </h2>
                <p className={`text-xs mt-0.5 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {currentUser?.role || 'System User'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className={`lg:hidden ${
                isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MdClose size={20} />
            </button>
          </div>
          <p className={`text-sm font-medium ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Task Management System
          </p>
        </div>

        {/* Menu Items */}
        <div className="flex-1 p-4 space-y-2">
          {menuItems.map(item => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;
            const hasSubmenu = item.submenu.length > 0;
            const isExpanded = expandedMenus[item.id];

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (hasSubmenu) {
                      toggleSubmenu(item.id);
                    } else {
                      handleMenuClick(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : isDarkMode
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <IconComponent size={20} />
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  
                  {/* Badge */}
                  {item.badge && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500 text-white">
                      {item.badge}
                    </span>
                  )}
                  
                  {hasSubmenu && (
                    isExpanded ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />
                  )}
                </button>

                {/* Submenu */}
                {hasSubmenu && isExpanded && (
                  <div className={`ml-4 mt-1 space-y-1 border-l pl-3 ${
                    isDarkMode ? 'border-slate-700' : 'border-slate-300'
                  }`}>
                    {item.submenu.map(subitem => (
                      <button
                        key={subitem.id}
                        onClick={() => handleMenuClick(subitem.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${
                          currentPage === subitem.id
                            ? 'bg-blue-500 text-white'
                            : isDarkMode
                            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {subitem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Section - Settings & Logout */}
        <div className={`p-4 border-t space-y-2 ${
          isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
        }`}>
          {/* Settings Button */}
          <button
            onClick={() => handleMenuClick('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
              currentPage === 'settings'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <MdSettings size={20} />
            <span className="flex-1 text-left text-sm font-medium">Settings</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
              isDarkMode
                ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <MdLogout size={20} />
            <span className="flex-1 text-left text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl shadow-2xl ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <MdLogout size={24} className="text-red-500" />
                Confirm Logout
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6">
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Are you sure you want to logout? Any unsaved changes will be lost.
              </p>
              
              {/* User Info */}
              <div className={`mt-4 p-4 rounded-lg border ${
                isDarkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                  }`}>
                    <span className="text-white font-medium">
                      {currentUser?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {currentUser?.name || 'Admin'}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {currentUser?.email || currentUser?.username || 'admin@system.com'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t flex gap-3 justify-end ${
              isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
            }`}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
              >
                <MdLogout size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;