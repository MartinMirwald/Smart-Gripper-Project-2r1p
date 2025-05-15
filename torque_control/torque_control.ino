/**
 * Torque control example of adaptive gripper. Based on SimpleFOC library.
 *
 * 1. After flashing this code to the XMC4700 Relax Kit, angle alignment will be
 *    applied. The gripper must be opened to its fullest extent to release the gear
 *    and minimize load for alignment.
 *
 * 2. After angle alignment, attach the gears (manually close the gripper a bit
 *    to align the gears) and you can start controlling the gripper's opening and
 *    closing. Pressing button 1 on the board will close the gripper, and pressing
 *    button 2 will open it. Note: There is no upper limit set for opening, so it
 *    is possible that the gears may detach if the maximum is exceeded.
 *
 * 3. Open the serial monitor/serial plotter to view data from the magnetic
 *    sensors placed under the TPU material on top of the clip. When the gripping
 *    clip grabs an object and generates pressure, the data changes.
 *
 * This is a basic example; you can be creative to improve this gripper!
 */

#include "TLE5012Sensor.h"
#include "TLx493D_inc.hpp"
#include "config.h"
#include <SimpleFOC.h>
#include <tlx5012-arduino.hpp>

// define SPI pins for TLE5012 sensor
#define PIN_SPI1_SS0 94   // Chip Select (CS) pin
#define PIN_SPI1_MOSI 69  // MOSI pin
#define PIN_SPI1_MISO 95  // MISO pin
#define PIN_SPI1_SCK 68   // SCK pin

using namespace tle5012;

Tle5012Ino Tle5012Sensor = Tle5012Ino();
errorTypes checkError = NO_ERROR;

double d;  // Winkel

const float growth_thresh = 0.05;

bool open = false;
bool close = false;
bool hold = true;

//PID parameters for constant force gripping
float Kp = 1.25;
float Ki = 0.0;
float Kd = 0.00;

// === PID-Zustände ===
float pid_integral = 0.0;
float pid_last_error = 0.0;

// === Sollwert für die Kraft (Magnetfeld-z-Wert) ===
float force_setpoint = -0.5;

// === Zeit für PID (für D-Glied & I-Glied) ===
unsigned long pid_last_time = 0;

// Initialize z_prev to prevent undefined behavior
double z_prev = 0.0;

// create an instance of SPIClass3W for 3-wire SPI communication
tle5012::SPIClass3W tle5012::SPI3W1(2);
// create an instance of TLE5012Sensor
TLE5012Sensor tle5012Sensor(&SPI3W1, PIN_SPI1_SS0, PIN_SPI1_MISO, PIN_SPI1_MOSI,
                            PIN_SPI1_SCK);

// BLDC motor instance BLDCMotor (polepairs, motor phase resistance, motor KV
// rating, motor phase inductance)
BLDCMotor motor = BLDCMotor(
  7, 0.24, 360,
  0.000133);  // 7 pole pairs, 0.24 Ohm phase resistance, 360 KV and 0.000133H
// you can find more data of motor in the doc

// define driver pins
const int U = 11;
const int V = 10;
const int W = 9;
const int EN_U = 6;
const int EN_V = 5;
const int EN_W = 3;

// BLDC driver instance
BLDCDriver3PWM driver = BLDCDriver3PWM(U, V, W, EN_U, EN_V, EN_W);

// voltage set point variable
float target_voltage = -1;

#if ENABLE_MAGNETIC_SENSOR
// create a instance of 3D magnetic sensor
using namespace ifx::tlx493d;
TLx493D_A2B6 dut(Wire1, TLx493D_IIC_ADDR_A0_e);
// define the number of calibration samples
const int CALIBRATION_SAMPLES = 20;
// offsets for calibration
double xOffset = 0, yOffset = 0, zOffset = 0;
#endif

#if ENABLE_COMMANDER
// instantiate the commander
Commander command = Commander(Serial);
void doTarget(char *cmd) {
  command.scalar(&target_voltage, cmd);
}
#endif

// Debouncing variables for buttons
unsigned long lastButtonPressTime = 0;
const unsigned long debounceDelay = 200; // milliseconds

void setup() {
  // use monitoring with serial
  Serial.begin(115200);
  // enable more verbose output for debugging
  // comment out if not needed
  SimpleFOCDebug::enable(&Serial);

  // initialise magnetic sensor hardware
  tle5012Sensor.init();
  // link the motor to the sensor
  motor.linkSensor(&tle5012Sensor);

  // power supply voltage
  driver.voltage_power_supply = 12;
  // limit the maximal dc voltage the driver can set
  // as a protection measure for the low-resistance motors
  // this value is fixed on startup
  driver.voltage_limit = 6;
  if (!driver.init()) {
    Serial.println("Driver init failed!");
    return;
  }
  // link the motor and the driver
  motor.linkDriver(&driver);

  // aligning voltage
  motor.voltage_sensor_align = 4;
  // choose FOC modulation (optional)
  motor.foc_modulation = FOCModulationType::SpaceVectorPWM;
  // set motion control loop to be used
  motor.controller = MotionControlType::torque;

  // comment out if not needed
  motor.useMonitoring(Serial);

  // initialize motor
  motor.init();
  // align sensor and start FOC
  motor.initFOC();
  Serial.println(F("Motor ready."));

#if ENABLE_MAGNETIC_SENSOR
  // start 3D magnetic sensor
  dut.begin();
  // calibrate 3D magnetic sensor to get the offsets
  calibrateSensor();
  Serial.println("3D magnetic sensor Calibration completed.");

  // set the pin modes for buttons
  pinMode(BUTTON1, INPUT);
  pinMode(BUTTON2, INPUT);
#endif

  // Initialize pid_last_time
  pid_last_time = millis();

  Serial.print("setup done.\n");
#if ENABLE_COMMANDER
  // add target command T
  command.add('T', doTarget, "target voltage");
  Serial.println(F("Set the target voltage using serial terminal:"));
#endif
  _delay(1000);
}

void loop() {
  // Update the motor and sensor at the beginning
  tle5012Sensor.update();
  motor.loopFOC();
  
  // Read angle before anything else to ensure consistent data
  Tle5012Sensor.getAngleValue(d);
  
  // Default output and target voltage - will be modified based on conditions
  float output = 0.0;
  
  checkSerialInput();

#if ENABLE_MAGNETIC_SENSOR
  // read the magnetic field data
  double x, y, z;
  dut.setSensitivity(TLx493D_FULL_RANGE_e);
  dut.getMagneticField(&x, &y, &z);

  // subtract the offsets from the raw data
  x -= xOffset;
  y -= yOffset;
  z -= zOffset;

  // Check for button presses with debouncing
  unsigned long currentTime = millis();
  if (currentTime - lastButtonPressTime > debounceDelay) {
    if (digitalRead(BUTTON2) == LOW && digitalRead(BUTTON1) == LOW) {
      open = false;
      close = false;
      hold = true;
      lastButtonPressTime = currentTime;
    } else if (digitalRead(BUTTON1) == LOW) {
      open = false;
      close = true;
      hold = false;
      lastButtonPressTime = currentTime;
    } else if (digitalRead(BUTTON2) == LOW) {
      open = true;
      close = false;
      hold = false;
      lastButtonPressTime = currentTime;
    }
  }

  // Calculate the force feedback and PID output only if needed
  float pid_output = 0.0;
  if (close) {
    pid_output = computePIDOutput(z);
  }

  // Calculate dz for resistance detection
  float dz = z - z_prev;
  z_prev = z;  // Update z_prev for next iteration
  
  // Safety check for angle - don't let arms go too deep
  bool angle_limit_exceeded = (d > 30);
  
  // Determine target voltage based on state and safety checks
  if (angle_limit_exceeded) {
    // Safety limits exceeded, stop movement
    target_voltage = 0;
    Serial.println("Angle limit exceeded - holding position");
  } else if (close) {
    if (dz > growth_thresh) {
      // Resistance detected, adjust force
      Serial.println("Resistance detected while closing");
      target_voltage = -pid_output;  // Use PID for force control
    } else {
      // Continue closing with normal force
      target_voltage = -3.0;  // Fixed closing force, can be adjusted
    }
    Serial.println("close");
  } else if (open) {
    target_voltage = 6;  // open gripper
    Serial.println("open");
  } else if (hold) {
    target_voltage = 0;  // maintain position
    Serial.println("hold");
  }

  // Print the magnetic field data
  Serial.print(x);
  Serial.print(",");
  Serial.print(y);
  Serial.print(",");
  Serial.print(z);
  Serial.print(",");
  Serial.print(target_voltage);
  Serial.println("");
#endif

#if ENABLE_READ_ANGLE
  Serial.print(tle5012Sensor.getSensorAngle());
  Serial.println("");
#endif

  // Apply the calculated target voltage to move the motor
  motor.move(target_voltage);

#if ENABLE_COMMANDER
  // user communication
  command.run();
#endif

  // Print angle for debug
  Serial.println(d);
  
  // Add a small delay to prevent overwhelming the serial monitor and CPU
  delay(10);
}

#if ENABLE_MAGNETIC_SENSOR
/**
 * @brief Calibrates the magnetic field sensor by calculating the average
 * offsets for the X, Y, and Z axes over a series of samples.
 */
void calibrateSensor() {
  double sumX = 0, sumY = 0, sumZ = 0;

  for (int i = 0; i < CALIBRATION_SAMPLES; ++i) {
    double temp;
    double valX, valY, valZ;

    dut.getMagneticFieldAndTemperature(&valX, &valY, &valZ, &temp);
    sumX += valX;
    sumY += valY;
    sumZ += valZ;

    delay(10);  // Adjust delay as needed
  }

  // Calculate average offsets
  xOffset = sumX / CALIBRATION_SAMPLES;
  yOffset = sumY / CALIBRATION_SAMPLES;
  zOffset = sumZ / CALIBRATION_SAMPLES;
}
#endif

float computePIDOutput(float current_force) {
  unsigned long now = millis();
  float dt = (now - pid_last_time) / 1000.0;

  // Prevent division by zero and handle first call
  if (dt <= 0.0) dt = 0.001;

  float error = force_setpoint - current_force;

  // Limit integral to prevent windup
  pid_integral += error * dt;
  pid_integral = constrain(pid_integral, -10.0, 10.0);
  
  float derivative = (error - pid_last_error) / dt;

  float output = Kp * error + Ki * pid_integral + Kd * derivative;
  
  pid_last_error = error;
  pid_last_time = now;

  return constrain(output, -5, 5);  // max +/- motor voltage
}

float getDistance() {
  Tle5012Sensor.getAngleValue(d);
  Serial.println(d);
  return d;
  //30 rad from closed to open
}

void checkSerialInput() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');  // Read input until newline
    input.trim();                                 // Remove any leading/trailing whitespace

    if (input.startsWith("open")) {
      open = true;
      close = false;
      hold = false;
    } else if (input == "close") {
      open = false;
      close = true;
      hold = false;
    } else if (input == "hold") {
      open = false;
      close = false;
      hold = true;
    } else if (input == "PING") {
      Serial.println("PONG");  // Respond to initialization check
    } else {
      Serial.println("Error: Invalid command. Use 'open', 'close', 'hold', or 'PING'.");
    }
  }
}