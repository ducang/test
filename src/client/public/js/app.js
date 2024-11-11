// app.js
// Main application entry point that initializes the MVC components
import { Model } from './model.js';
import { View } from './view.js';
import { Controller } from './controller.js';
import { firebase } from './firebase.js';

window.SFUScheduler = {
    model: null,
    controller: null
};
// Wait for DOM to be fully loaded before initializing the application
document.addEventListener('DOMContentLoaded', () => {
    // Create instances of Model, View, and Controller components
    const model = new Model(firebase);
    const view = new View();
    const controller = new Controller(model, view);

    window.SFUScheduler.model = model;
    window.SFUScheduler.controller = controller;
});

