import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import WAVES from 'vanta/dist/vanta.waves.min';
import * as THREE from 'three';

interface VantaBackgroundProps {
    children?: React.ReactNode;
    className?: string;
}

const VantaBackground: React.FC<VantaBackgroundProps> = ({ children, className = "" }) => {
    const vantaRef = useRef<HTMLDivElement>(null);
    const [vantaEffect, setVantaEffect] = useState<any>(null);

    useEffect(() => {
        if (!vantaEffect && vantaRef.current) {
            setVantaEffect(
                WAVES({
                    el: vantaRef.current,
                    THREE: THREE,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.00,
                    minWidth: 200.00,
                    scale: 1.00,
                    scaleMobile: 1.00,
                    color: 0x111111, // A dark base for the waves
                    shininess: 30.00,
                    waveHeight: 15.00,
                    waveSpeed: 1.00,
                    zoom: 1.00
                })
            );
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        };
    }, [vantaEffect]);

    return (
        <div
            ref={vantaRef}
            className={`min-h-screen w-full relative overflow-hidden ${className}`}
        >
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default VantaBackground;
