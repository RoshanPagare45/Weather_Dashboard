import { Component } from "react";

/*
 * Catches render-time crashes so the whole page never goes
 * blank — the user gets a message and a reload button.
 */
class ErrorBoundary extends Component {

    state = { hasError: false };

    static getDerivedStateFromError() {

        return { hasError: true };

    }

    componentDidCatch(error) {

        console.error("UI crashed:", error);

    }

    render() {

        if (!this.state.hasError) {

            return this.props.children;

        }

        return (

            <div
                role="alert"
                style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#fff"
                }}
            >

                <h2>Something went wrong</h2>

                <p>
                    The dashboard hit an unexpected problem.
                </p>

                <button
                    type="button"
                    onClick={() => window.location.reload()}
                >
                    Reload
                </button>

            </div>

        );

    }

}

export default ErrorBoundary;
