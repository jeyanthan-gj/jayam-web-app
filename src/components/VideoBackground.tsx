import React from 'react';

interface VideoBackgroundProps {
    children?: React.ReactNode;
    className?: string;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ children, className = "" }) => {
    return (
        <div className={`relative min-h-screen w-full overflow-hidden ${className}`}>
            {/* Video Element */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            >
                <source src="/background-tunnel.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            {/* Dark Overlay for Readability */}
            <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-[1]"></div>

            {/* Content Container */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default VideoBackground;
