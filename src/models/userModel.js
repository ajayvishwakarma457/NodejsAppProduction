// Mock Database Model
let users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" }
];

const UserModel = {
  getAll: () => users,
  
  getById: (id) => users.find(u => u.id === id),
  
  create: (userData) => {
    const newUser = {
      id: users.length ? users[users.length - 1].id + 1 : 1,
      name: userData.name,
      email: userData.email
    };
    users.push(newUser);
    return newUser;
  },
  
  update: (id, userData) => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;
    
    users[userIndex] = {
      ...users[userIndex],
      name: userData.name || users[userIndex].name,
      email: userData.email || users[userIndex].email
    };
    return users[userIndex];
  },
  
  delete: (id) => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) return false;
    users.splice(userIndex, 1);
    return true;
  }
};

module.exports = UserModel;
