from setuptools import setup, find_packages

setup(
    name="opus-motion",
    version="1.0.0",
    description="All-in-one AI film studio, 157 code animation styles, 703 viral prompts, VoiceStudio REA cloning, and CLI proxy gateway",
    author="Antigravity & Entelechae",
    url="https://github.com/lemomo-ai/opus-motion",
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.9",
    install_requires=[],
    extras_require={
        "accelerate": ["numpy>=1.24.0", "requests>=2.31.0"],
        "dev": ["pytest>=7.0.0"]
    },
    entry_points={
        "console_scripts": [
            "opus-motion=cli:main",
        ],
    },
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Multimedia :: Graphics",
        "Topic :: Multimedia :: Sound/Audio",
    ],
)
