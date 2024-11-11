
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, updateProfile, sendEmailVerification, sendPasswordResetEmail, getIdToken} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, set, child, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

import { deleteUser } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { remove } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

import { alertSystem } from './alertSystem.js';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  reauthenticateWithPopup
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAhxD7NTuqnnN0XSpe9Mo4CFXkOlPXrbtM",
  authDomain: "cmpt276-d42a2.firebaseapp.com",
  projectId: "cmpt276-d42a2",
  storageBucket: "cmpt276-d42a2.appspot.com",
  messagingSenderId: "775038384726",
  appId: "1:775038384726:web:b38b0f7c5dee100e1099f7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const database = getDatabase(app);

const registerButton = document.getElementById("submitRegister");
const loginButton = document.getElementById("submitLogin");
const googleButton = document.getElementById("google-login-btn");
const forgotPassword = document.getElementById("forgotPassword");

export class Firebase {
  static instance = null;

  static getInstance() {
    if (!Firebase.instance) {
      Firebase.instance = new Firebase();
    }
    return Firebase.instance;
  }

  constructor() {
    if (Firebase.instance) {
      return Firebase.instance;
    }

    this.auth = auth;
    this.db = database;
    this.provider = provider;
    this.loaded = false;

    // Set up auth state listener
    this.auth.onAuthStateChanged((user) => {
      if (user && window.location.pathname.endsWith('index.html')) {

        this.readData(user.uid);
      }
    });
    Firebase.instance = this;
  }


  getUid() {
    const user = auth.currentUser;
    if (user) {
      return user.uid;
    } else {
      console.error("No user is signed in. UID is null.");
      return null;
    }
  }

  getDisplayName() {
    const user = this.auth.currentUser;
    if (user) {
      console.log(user.displayName);
      return user.displayName;
    } else {
      console.log("No user is signed in. Display name is null.");
      return "Guest";
    }
  }

  getEmail() {
    const user = this.auth.currentUser;
    if (user) {
      return user.email;
    } else {
      console.log("No user is signed in. Email is null.");
      return "No email";
    }
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }


  //Writes data to database
  writeUserData(userId, courseList = [], courseTimeList = [], currentScheduleIndex = 0) {
    const db = getDatabase();
    const selectedSemester = localStorage.getItem('selectedSemester');

    if (!selectedSemester) {
      console.error("No semester selected");
      return;
    }

    // Create a semester-specific path in the database
    const semesterPath = `users/${userId}/schedules/${selectedSemester}`;

    set(ref(db, semesterPath), {
      courseList: courseList,
      courseTimeList: courseTimeList,
      currentScheduleIndex: currentScheduleIndex
    });

    // Also store the last selected semester
    set(ref(db, `users/${userId}/lastSemester`), selectedSemester);
  }
  

  // read semester-specific schedules
  async readData(userId) {
    if (!userId) return;

    try {
      const selectedSemester = localStorage.getItem('selectedSemester');
      if (!selectedSemester) {
        console.error("No semester selected");
        return;
      }

      const semesterPath = `users/${userId}/schedules/${selectedSemester}`;
      const snapshot = await get(child(ref(this.db), semesterPath));

      if (snapshot.exists() && window.SFUScheduler?.model) {
        const data = snapshot.val();

        // Wait until model is loaded
        while (!window.SFUScheduler.controller.loaded) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        window.SFUScheduler.model.courseList.clear();
        if (data.courseList) {
          data.courseList.forEach((course) => {
            window.SFUScheduler.model.courseList.add(course);
          });
          await window.SFUScheduler.controller.generateAndDisplaySchedules(data.currentScheduleIndex);
          alertSystem.showSuccess("Saved schedule loaded successfully");
        }
      }
    } catch (error) {
      console.error("Error reading data:", error);
    }
  }


  async getCourseList(userId) {
    if (!userId) return;

    const selectedSemester = localStorage.getItem('selectedSemester');
    if (!selectedSemester) return;

    try {
      const semesterPath = `users/${userId}/schedules/${selectedSemester}`;
      const snapshot = await get(child(ref(this.db), semesterPath));

      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.courseList) {
          return data.courseList;
        }
      }
    } catch (error) {
      console.error("Error reading course list:", error);
    }
  }

  async getCourseTimeList(userId) {
    if (!userId) return;

    const selectedSemester = localStorage.getItem('selectedSemester');
    if (!selectedSemester) return;

    try {
      const semesterPath = `users/${userId}/schedules/${selectedSemester}`;
      const snapshot = await get(child(ref(this.db), semesterPath));

      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.courseTimeList) {
          return data.courseTimeList;
        }
      }
    } catch (error) {
      console.error("Error reading course time list:", error);
    }
  }

  async getSavedSemesters(userId) {
    if (!userId) return [];

    try {
      const snapshot = await get(child(ref(this.db), `users/${userId}/schedules`));
      if (snapshot.exists()) {
        return Object.keys(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error("Error getting saved semesters:", error);
      return [];
    }
  }

  async loginWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      if(!user.emailVerified){
        await this.auth.signOut();
        alertSystem.showAlert("Please verify your email before logging in. A new verification email has been sent.");
        await sendEmailVerification(user);
        return;
      }

      await updateProfile(userCredential.user, {
        displayName: null
      });

      // Get the ID token of the user
      const token = await user.getIdToken();
      console.log(token);
      // Redirect to the dashboard or make an authenticated request
      localStorage.setItem('firebaseToken', token); // Save the token to use in requests
      alertSystem.showSuccess("Successfully logged in!", true);
      window.location.href = "/semester.html";
    } catch (error) {
      let errorMessage;
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Incorrect email or password';
          break;
        default:
          errorMessage = `Error during login: ${error.message}`;
      }
      throw new Error(errorMessage);
    }
  }

  async registerWithEmail(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(this.auth.currentUser, {
        displayName: email
      });
      await this.writeUserData(userCredential.user.uid, [], []);
      await sendEmailVerification(userCredential.user);
      alertSystem.showAlert(`Verification email sent to ${email}. Please verify before logging in.`);
    } catch (error) {
      let errorMessage;
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 6 characters.';
          break;
        default:
          errorMessage = 'Error during registration. Please try again.';
      }
      throw new Error(errorMessage);
    }
  }

  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(this.auth, this.provider);
      //await sendEmailVerification(userCredential.user);
      const user = result.user;
      // Get the ID token of the user
      const token = await user.getIdToken();

      // Redirect to the dashboard or make an authenticated request
      localStorage.setItem('firebaseToken', token); // Save the token to use in requests
      alertSystem.showSuccess("Successfully logged in with Google!", true);
      window.location.href = "semester.html";
    } catch (error) {
      let errorMessage = 'Error logging in with Google. Please try again.';
      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      }
      throw new Error(errorMessage);
    }
  }

  async logout(default_value = false) {
    try {
      await signOut(this.auth);
      if (default_value) {
        alertSystem.showSuccess("Continuing as guest", true);
      } else {
        alertSystem.showSuccess("Successfully logged out!", true);
      }
    } catch (error) {
      alertSystem.showError("Error during logout. Please try again.");
    }
  }

  async deleteAccount() {
    const user = this.auth.currentUser;
    if (!user) {
      alertSystem.showError("No user is currently signed in.");
      return false;
    }

    try {
      // Check if user is signed in with Google
      const isGoogleUser = user.providerData.some(
        provider => provider.providerId === 'google.com'
      );

      if (isGoogleUser) {
        try {
          // Reauthenticate with Google
          await reauthenticateWithPopup(user, this.provider);
        } catch (reAuthError) {
          switch (reAuthError.code) {
            case 'auth/user-mismatch':
              this.showModalError('Please use the same Google account you signed up with.');
              return false;
            case 'auth/user-cancelled':
              this.showModalError('Authentication cancelled. Please try again.');
              return false;
            case 'auth/popup-closed-by-user':
              this.showModalError('Authentication popup was closed. Please try again.');
              return false;
            default:
              throw reAuthError;
          }
        }
      } else {
        // Get password from modal
        const password = document.getElementById('confirmPassword').value;
        if (!password) {
          this.showModalError('Please enter your password');
          return false;
        }

        // Create credentials and reauthenticate
        const credential = EmailAuthProvider.credential(
          user.email,
          password
        );
        await reauthenticateWithCredential(user, credential);
      }

      // If reauthentication successful, proceed with deletion
      const userRef = ref(this.db, `users/${user.uid}`);
      await remove(userRef);
      await deleteUser(user);

      alertSystem.showSuccess("Account deleted successfully", true);
      window.location.href = "login.html";
      return true;

    } catch (error) {
      console.error("Error deleting account:", error);
      let errorMessage;

      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          this.showModalError('Incorrect password. Please try again.');
          document.getElementById('confirmPassword').value = '';
          return false;
        case 'auth/user-mismatch':
          this.showModalError('Please use the same account you signed up with.');
          return false;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Please sign out and sign in again before deleting your account.';
          break;
        case 'auth/popup-blocked':
          this.showModalError('Please allow the popup to reauthenticate with Google.');
          return false;
        case 'auth/cancelled-popup-request':
          this.showModalError('Authentication cancelled. Please try again.');
          return false;
        case 'auth/popup-closed-by-user':
          this.showModalError('Authentication popup was closed. Please try again.');
          return false;
        default:
          errorMessage = 'Error deleting account. Please try again.';
      }

      alertSystem.showError(errorMessage);
      return false;
    }

  }

  showModalError(message) {
    const errorDiv = document.getElementById('deleteAccountError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  async makeAuthenticatedRequest(endpoint, method = 'GET', body = null) {
    // Retrieve the token from localStorage
    const token = localStorage.getItem('firebaseToken');
    if (!token) {
      alertSystem.showError("User is not authenticated.");
      return;
    }
  
    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`, // Send token as a Bearer token
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : null
      });
  
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
  
      // Assuming JSON response; adjust based on your API
      const data = await response.json();
      console.log("Data from server:", data);
      return data;
    } catch (error) {
      console.error("Error in request:", error.message);
      alertSystem.showError(`Request error: ${error.message}`);
    }
  }
  
  
}


const firebaseInstance = new Firebase();

var path = window.location.pathname;
var page = path.split("/").pop();


// Update the event listeners section at the bottom of firebase.js
if (page == "login.html") {
  var registering = false;

  // Register
  registerButton.addEventListener('click', async (e) => {
    e.preventDefault();
    if (registering) return;
    registering = true;

    const registerUser = document.getElementById("registerEmail").value;
    const registerPass = document.getElementById("registerPass").value;

    try {
      if (!registerUser || !registerPass) {
        throw new Error('Please fill in all fields.');
      }

      const user = await firebaseInstance.registerWithEmail(registerUser, registerPass);
      registering = false;
      document.getElementById("registerEmail").value = '';
      document.getElementById("registerPass").value = '';
      document.getElementById("registerForm").classList.add("hidden");
      document.getElementById("loginForm").classList.remove("hidden");
    } catch (error) {
      alertSystem.showError(error.message);
      registering = false;
    }
  });

  // Guest Button
  document.getElementById("guest").addEventListener('click', (e) => {
    firebase.logout(true);
    localStorage.setItem("UserMode", "Guest");
  });

  // Login 
  loginButton.addEventListener('click', async (e) => {
    e.preventDefault();
    localStorage.setItem("UserMode", "Account");
    const loginUser = document.getElementById("loginEmail").value;
    const loginPass = document.getElementById("loginPass").value;

    try {
      if (!loginUser || !loginPass) {
        throw new Error('Please fill in all fields.');
      }
      await firebaseInstance.loginWithEmail(loginUser, loginPass);
      await firebaseInstance.makeAuthenticatedRequest('http://localhost:3000/protected')
    .then(data => {
      console.log("Protected data:", data);
    })
    .catch(err => console.error(err));
    } catch (error) {
      alertSystem.showError(error.message);
    }
  });

  // Google
  googleButton.addEventListener("click", async function () {
    try {
      await firebaseInstance.loginWithGoogle();
    } catch (error) {
      alertSystem.showError(error.message);
    }
    localStorage.setItem("UserMode", "Account");
  });

  //Forgot Password
  forgotPassword.addEventListener("click", (e) => {
    const email = document.getElementById("loginEmail").value;
      sendPasswordResetEmail(auth, email)
      .then(()=> {
        alertSystem.showSuccess("If an account with this email exists, a password reset link has been sent.");
      })
      .catch((error)=> {
        alertSystem.showError("Enter an appropriate email address");
      })
    });
}

export const firebase = Firebase.getInstance();