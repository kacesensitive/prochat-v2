"use client";
import { useState, useRef } from 'react';
import styles from './images.module.css';

export default function Control() {
    const [images, setImages] = useState<{ url: string; name: string }[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const galleryRef = useRef<HTMLDivElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const imageFiles = Array.from(e.target.files);
            const imagePaths = imageFiles.map((file, index) => ({
                url: URL.createObjectURL(file),
                name: file.name,
            }));
            setImages(imagePaths);
        }
    };

    const handleImageClick = (index: number) => {
        setSelectedImageIndex(index);
        localStorage.setItem('selectedImage', images[index].url);
    };

    const handleRandomClick = () => {
        const randomIndex = Math.floor(Math.random() * images.length);
        handleImageClick(randomIndex);

        // if (galleryRef.current && galleryRef.current.children[randomIndex]) {
        //     (galleryRef.current.children[randomIndex] as HTMLElement).scrollIntoView({ behavior: 'smooth' });
        // }
    };

    return (
        <main className={styles.main}>
            <div className={styles.pathSelector}>
                <input type="file" multiple onChange={handleFileChange} className={styles.pathButton} />
            </div>
            <button onClick={handleRandomClick} className={styles.randomButton}>
                Random
            </button>
            <div className={styles.gallery} ref={galleryRef}>
                {images.map((image, index) => (
                    <div
                        key={index}
                        className={`${styles.imageContainer} ${index === selectedImageIndex ? styles.selected : ''}`}
                        onClick={() => handleImageClick(index)}
                    >
                        <img src={image.url} alt={`${index === selectedImageIndex ? 'Image-active' : 'Image'} ${index + 1}`} className={styles.image} />
                        {index === selectedImageIndex && <div className={styles.checkmark}>&#10003;</div>}
                    </div>
                ))}
            </div>
        </main>
    );
}
