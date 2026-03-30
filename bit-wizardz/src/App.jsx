import CameraFeed from './components/CameraFeed';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>BIT WIZARDZ</h1>
        <p>Biometric Identity Terminal</p>
      </header>

      <main>
        <CameraFeed />
      </main>

      <footer className="app-footer">
        <p>SECURE CONNECTION ESTABLISHED</p>
      </footer>
    </div>
  );
}

export default App;
