"""Logistic regression fitted by gradient descent, for the complete example post."""

import numpy as np


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))


class LogisticRegression:
    def __init__(self, step=0.1, steps=500):
        self.step = step
        self.steps = steps
        self.w = None

    def fit(self, X, y):
        n, d = X.shape
        self.w = np.zeros(d)
        for _ in range(self.steps):
            p = sigmoid(X @ self.w)
            gradient = X.T @ (p - y) / n
            self.w -= self.step * gradient
        return self

    def predict(self, X):
        return (sigmoid(X @ self.w) >= 0.5).astype(int)
