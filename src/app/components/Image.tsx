"use client";
import { useState, useEffect } from 'react';
import styles from './image.module.css';

export default function Image() {
    const [selectedImage, setSelectedImage] = useState(localStorage.getItem('selectedImage') || "");

    useEffect(() => {
        const updateSelectedImage = () => {
            setSelectedImage(localStorage.getItem('selectedImage') || "");
        };

        window.addEventListener('storage', updateSelectedImage);

        return () => {
            window.removeEventListener('storage', updateSelectedImage);
        };
    }, []);

    return (
        <main className={styles.main}>
            {selectedImage ? <img src={selectedImage} alt="" /> : <p>No image selected</p>}
        </main>
    );
}