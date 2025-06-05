# Serial Port Printer Setup Guide

This documentation explains how to set up and configure serial port printers with the application, including how to work with different baud rates.

## Introduction

Serial port printers connect to your computer via serial ports (COM ports on Windows, /dev/ paths on Mac and Linux) and require proper configuration, including the correct baud rate, to communicate with the application.

## Prerequisites

- A printer with serial port connectivity
- Proper serial port cable
- Serial port driver installed on your system
- Knowledge of your printer's default baud rate (typically found in the printer's manual)

## Configuring a Serial Port Printer

### 1. Finding Your Serial Port Path

#### Windows
- The serial port path will be in the format `COM1`, `COM2`, etc.
- You can find available COM ports in Device Manager under "Ports (COM & LPT)"

#### macOS
- Serial ports are typically found in the `/dev/` directory with names like `/dev/tty.usbserial-*`
- Run `ls /dev/tty.*` in Terminal to list available serial ports

#### Linux
- Serial ports are typically found in the `/dev/` directory with names like `/dev/ttyS0` or `/dev/ttyUSB0`
- Run `ls /dev/tty*` in Terminal to list available serial ports

### 2. Adding a Serial Port Printer

1. Open the application and navigate to "Printer Settings"
2. Click "Add New Printer"
3. Enter a name for your printer
4. Select "Serial" as the connection type
5. Enter the serial port path you identified above
6. Select the appropriate baud rate for your printer from the dropdown menu
7. Click "Test Connection" to verify the printer is accessible
8. Save your printer configuration

### 3. Understanding Baud Rates

The baud rate is the speed at which data is transferred through the serial port. Both your computer and printer must use the same baud rate to communicate properly.

Common baud rates for printers include:

- **9600** - The most common default rate for many printers
- **19200** - Higher speed for some modern printers
- **38400** - Faster communication for printers that support it
- **57600** - High-speed communication
- **115200** - Very high-speed communication

**Important:** If you're unsure which baud rate your printer uses, consult your printer's documentation or try 9600 as a starting point, which is the most common default rate.

## Troubleshooting

### Connection Issues

If you see "Could not connect to printer" when testing the connection:

1. Verify the serial port path is correct
2. Make sure the printer is powered on and connected properly
3. Try a different baud rate - your printer may require a specific speed
4. Check if the serial port requires special permissions (on macOS/Linux)
5. Ensure no other application is using the serial port

### Print Quality Issues

If prints are garbled or incomplete:

1. The baud rate may be incorrect - try a lower rate
2. Make sure the printer supports the ZPL commands being sent
3. Check the printer's built-in settings for communication parameters

### No Serial Ports Found

If you don't see any serial ports:

1. Check physical connections
2. Install the appropriate drivers for your serial adapter
3. On Windows, verify the COM port is not disabled in Device Manager
4. On macOS/Linux, ensure you have appropriate permissions to access serial devices

## Advanced Configuration

For advanced users who need custom serial port settings:

- The application currently supports configuring the baud rate
- Future versions may include additional settings such as:
  - Data bits (typically 8)
  - Stop bits (typically 1)
  - Parity (typically None)
  - Flow control (hardware vs. software)

## Need Help?

If you continue to experience issues connecting to your serial port printer, please contact support with the following information:

- Your operating system version
- Printer make and model
- Serial port path you're using
- Baud rate you've attempted
- Any error messages received
