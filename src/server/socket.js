/* eslint-disable no-param-reassign */
const { io } = require('./index.js');

const {
  VERIFY_USER,
  USER_CONNECTED,
  USER_DISCONNECTED,
  LOGOUT,
  COMMUNITY_CHAT,
  MESSAGE_RECIEVED,
  MESSAGE_SENT,
  TYPING,
  PRIVATE_MESSAGE,
  NEW_CHAT_USER,
} = require('../helper/constants');

const {
  createUser,
  createMessage,
  createChat,
} = require('../helper/container');

let connectedUsers = {};

const communityChat = createChat({ isCommunity: true });
/*
 * Returns a function that will take a chat id and a boolean isTyping
 * and then emit a broadcast to the chat id that the sender is typing
 * @param sender {string} username of sender
 * @return function(chatId, message)
 */
function sendTypingToChat(user) {
  return (chatId, isTyping) => {
    io.emit(`${TYPING}-${chatId}`, { user, isTyping });
  };
}

/*
 * Returns a function that will take a chat id and message
 * and then emit a broadcast to the chat id.
 * @param sender {string} username of sender
 * @return function(chatId, message)
 */
function sendMessageToChat(sender) {
  return (chatId, message) => {
    io.emit(
      `${MESSAGE_RECIEVED}-${chatId}`,
      createMessage({ message, sender })
    );
  };
}

/*
 * Adds user to list passed in.
 * @param userList {Object} Object with key value pairs of users
 * @param user {User} the user to added to the list.
 * @return userList {Object} Object with key value pairs of Users
 */
function addUser(userList, user) {
  const newList = { ...userList };
  newList[user.name] = user;
  return newList;
}

/*
 * Removes user from the list passed in.
 * @param userList {Object} Object with key value pairs of Users
 * @param username {string} name of user to be removed
 * @return userList {Object} Object with key value pairs of Users
 */
function removeUser(userList, username) {
  const newList = { ...userList };
  delete newList[username];
  return newList;
}

/*
 * Checks if the user is in list passed in.
 * @param userList {Object} Object with key value pairs of Users
 * @param username {String}
 * @return userList {Object} Object with key value pairs of Users
 */
function isUser(userList, username) {
  return username in userList;
}

module.exports = function(socket) {
  let sendMessageToChatFromUser;

  let sendTypingFromUser;

  // Verify Username
  socket.on(VERIFY_USER, (nickname, callback) => {
    if (isUser(connectedUsers, nickname)) {
      callback({ isUser: true, user: null });
    } else {
      callback({
        isUser: false,
        user: createUser({ name: nickname, socketId: socket.id }),
      });
    }
  });

  // User Connects with username
  socket.on(USER_CONNECTED, user => {
    user.socketId = socket.id;
    connectedUsers = addUser(connectedUsers, user);
    socket.user = user;

    sendMessageToChatFromUser = sendMessageToChat(user.name);
    sendTypingFromUser = sendTypingToChat(user.name);

    io.emit(USER_CONNECTED, connectedUsers);
  });

  // User disconnects
  socket.on('disconnect', () => {
    if ('user' in socket) {
      connectedUsers = removeUser(connectedUsers, socket.user.name);

      io.emit(USER_DISCONNECTED, connectedUsers);
    }
  });

  // User logsout
  socket.on(LOGOUT, () => {
    connectedUsers = removeUser(connectedUsers, socket.user.name);
    io.emit(USER_DISCONNECTED, connectedUsers);
  });

  // Get Community Chat
  socket.on(COMMUNITY_CHAT, callback => {
    callback(communityChat);
  });

  socket.on(MESSAGE_SENT, ({ chatId, message }) => {
    sendMessageToChatFromUser(chatId, message);
  });

  socket.on(TYPING, ({ chatId, isTyping }) => {
    sendTypingFromUser(chatId, isTyping);
  });

  socket.on(PRIVATE_MESSAGE, ({ reciever, sender, activeChat }) => {
    if (reciever in connectedUsers) {
      const recieverSocket = connectedUsers[reciever].socketId;
      if (activeChat === null || activeChat.id === communityChat.id) {
        const newChat = createChat({
          name: `${reciever}&${sender}`,
          users: [reciever, sender],
        });
        socket.to(recieverSocket).emit(PRIVATE_MESSAGE, newChat);
        socket.emit(PRIVATE_MESSAGE, newChat);
      } else {
        if (!(reciever in activeChat.users)) {
          activeChat.users
            .filter(user => user in connectedUsers)
            .map(user => connectedUsers[user])
            // eslint-disable-next-line array-callback-return
            .map(user => {
              socket.to(user.socketId).emit(NEW_CHAT_USER, {
                chatId: activeChat.id,
                newUser: reciever,
              });
            });
          socket.emit(NEW_CHAT_USER, {
            chatId: activeChat.id,
            newUser: reciever,
          });
        }
        socket.to(recieverSocket).emit(PRIVATE_MESSAGE, activeChat);
      }
    }
  });
};
