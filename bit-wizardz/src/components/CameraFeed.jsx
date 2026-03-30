import { useEffect, useRef, useState } from 'react';

const CameraFeed = () => {
    const videoRef = useRef(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setHasPermission(true);
            } catch (err) {
                console.error("Error accessing camera:", err);
                setHasPermission(false);
            }
        };

        startCamera();
    }, []);

    const handleScan = () => {
        setScanning(true);
        setTimeout(() => setScanning(false), 3000); // Stop scan after 3s
    };

    return (
        <div className="camera-feed-container glass-panel">
            {!hasPermission && (
                <div className="camera-placeholder">
                    <p>Initializing Optical Sensors...</p>
                    <p className="sub-text">(Please allow permission)</p>
                </div>
            )}

            <div className="video-wrapper">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                />
            </div>

            {/* Face Guide Overlay */}
            <div className="overlay-guide">
                <div className="face-frame">
                    <div className={`scan-line ${scanning ? 'active' : ''}`} />
                </div>
            </div>

            {/* UI Controls */}
            <div className="controls-container">
                <button
                    onClick={handleScan}
                    disabled={scanning || !hasPermission}
                    className={`btn-primary ${scanning ? 'disabled' : ''}`}
                >
                    {scanning ? 'SCANNING...' : 'INITIATE SCAN'}
                </button>
            </div>

            {/* Decorative Elements */}
            <div className="hud-text top-left">SYS.READY</div>
            <div className="hud-text top-right">VN-808</div>
            <div className="corner-bracket top-left"></div>
            <div className="corner-bracket top-right"></div>
            <div className="corner-bracket bottom-left"></div>
            <div className="corner-bracket bottom-right"></div>
        </div>
    );
};

export default CameraFeed;
