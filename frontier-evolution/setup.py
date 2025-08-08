from setuptools import setup, find_packages

setup(
    name='frontier-evolution',
    version='0.1.0',
    author='Your Name',
    author_email='your.email@example.com',
    description='A self-evolving AI system for reviewing and enhancing code in the FrontierAI GitHub repository.',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    url='https://github.com/yourusername/frontier-evolution',
    packages=find_packages(where='src'),
    package_dir={'': 'src'},
    install_requires=[
        # List your project dependencies here
        'requests',
        'numpy',
        'pandas',
        # Add other dependencies as needed
    ],
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
    ],
    python_requires='>=3.6',
)