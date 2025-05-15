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
//hey please use robot gripper 2
//TEST
#include "TLE5012Sensor.h"
#include "TLx493D_inc.hpp"
#include "config.h"
#include <SimpleFOC.h>
#include <tlx5012-arduino.hpp>

using namespace tle5012;

Tle5012Ino Tle5012Sensor = Tle5012Ino();
errorTypes checkError = NO_ERROR;

// define SPI pins for TLE5012 sensor
#define PIN_SPI1_SS0 94   // Chip Select (CS) pin
#define PIN_SPI1_MOSI 69  // MOSI pin
#define PIN_SPI1_MISO 95  // MISO pin
#define PIN_SPI1_SCK 68   // SCK pin


//global variables for system states
bool open = false;
bool close = false;
bool hold = true;
float distance = 0;
float upper_voltage_limit = -5;
float lower_voltage_limit = 5;
double x, y, z;
float output = 0;
double forcethreshhold = 2;

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

void setup() {
  // use monitoring with serial
  Serial.begin(115200);
  while (!Serial) {
    ;  // Wait for serial port to connect. Needed for native USB port only
  }

  // enable more verbose output for debugging
  // comment out if not needed
  SimpleFOCDebug::enable(&Serial);

  Serial.println("Starting setup...");

  // initialise magnetic sensor hardware
  tle5012Sensor.init();
  Serial.println("TLE5012 sensor initialized");

  // link the motor to the sensor
  motor.linkSensor(&tle5012Sensor);
  Serial.println("Motor linked to sensor");

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
  Serial.println("Driver initialized");

  // link the motor and the driver
  motor.linkDriver(&driver);
  Serial.println("Motor linked to driver");

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
  Serial.println("Motor initialized");

  // align sensor and start FOC
  motor.initFOC();
  Serial.println("FOC initialized");
  Serial.println(F("Motor ready."));

#if ENABLE_MAGNETIC_SENSOR
  // start 3D magnetic sensor
  dut.begin();
  Serial.println("3D magnetic sensor started");

  // calibrate 3D magnetic sensor to get the offsets
  calibrateSensor();
  Serial.println("3D magnetic sensor Calibration completed");

  // set the pin modes for buttons
  pinMode(BUTTON1, INPUT);
  pinMode(BUTTON2, INPUT);
  Serial.println("Buttons initialized");
#endif

  Serial.println(F("Arduino ready for commands."));
  Serial.println(F("Available commands:"));
  Serial.println(F("- position <value>: Set position (0-6V)"));
  Serial.println(F("- open: Open gripper"));
  Serial.println(F("- close: Close gripper"));
  Serial.println(F("- hold: Hold current position"));
  Serial.println(F("- measure: Send current measurements"));
  Serial.println(F("- PING: Test connection"));

  _delay(1000);
}

void loop() {
  checkSerialInput();  //get control signals from GUI

  //smart object presence detection
  if (abs(y) + abs(z) > abs(forcethreshhold)) {  //z < forcethreshhold) {
    target_voltage = 0;
    output = -3;
    //distance = 10;
    //return;
  }
#if ENABLE_MAGNETIC_SENSOR
  // read the magnetic field data
  dut.setSensitivity(TLx493D_FULL_RANGE_e);
  dut.getMagneticField(&x, &y, &z);

  // subtract the offsets from the raw data
  x -= xOffset;
  y -= yOffset;
  z -= zOffset;

  // output = computePIDOutput(z);

  //read buttons decide open close hold state
  if (digitalRead(BUTTON2) == LOW && digitalRead(BUTTON1) == LOW) {
    holdgripper();
    delay(1000);
  } else if (digitalRead(BUTTON1) == LOW) {
    closegripper();  // PID macht Kraftregelung für close
  } else if (digitalRead(BUTTON2) == LOW) {
    opengripper();
  }

  sendStates();
  Serial.println("Data sent");  // Debug message
#endif

  // update angle sensor data
  tle5012Sensor.update();
  motor.move(target_voltage);

  // main FOC algorithm function
  motor.loopFOC();

  // Motion control function
  motor.move(target_voltage);
#if ENABLE_COMMANDER
  // user communication
  command.run();
#endif
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

//PID control for constant force grip
float computePIDOutput(float current_force) {
  unsigned long now = millis();
  float dt = (now - pid_last_time) / 1000.0;

  if (dt <= 0.0) dt = 0.001;

  float error = force_setpoint - current_force;

  pid_integral += error * dt;
  float derivative = (error - pid_last_error) / dt;

  float output = -Kp * error + Ki * pid_integral + Kd * derivative;
  //Serial.println("output:");

  motor.move(target_voltage);
  pid_last_error = error;
  pid_last_time = now;

  return constrain(output, -5, 5);  // max +/- Spannung deines Motors
}

//gives the distance between gripper fingers in % (M is for Martin)
double getDistanceM() {
  double d = 0.0;
  d = motor.sensor->getAngle();
  d = ((19 + d) / 19) * 100;
  //d=tle5012Sensor.getAngle();
  //d=d/(2*PI*30);
  //Serial.println(d);
  return d;
  //30 rad von zu bis offen
}


//checks for signals from GUI and changes system states
void checkSerialInput() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();  // Remove any whitespace

    if (input.startsWith("position ")) {
      // Extract position value
      String posStr = input.substring(9);
      float position = posStr.toFloat();

      // Convert position (0-100) to voltage (0-6V)
      float voltage = (position / 100.0) * 6.0;

      // Set target voltage
      target_voltage = voltage;
      Serial.print("Setting position to: ");
      Serial.print(position);
      Serial.print("% (");
      Serial.print(voltage);
      Serial.println("V)");
    } else if (input == "open") {
      opengripper();  // open
      Serial.println("Opening gripper");
    } else if (input == "close") {
      closegripper();  //  for closed position
      Serial.println("Closing gripper");
    } else if (input == "hold") {
      holdgripper();  // Keep current voltage
      Serial.println("Holding current position");
    } else if (input == "measure") {
      // Send current measurements
      sendStates();
      Serial.println("Measurement sent");
    } else if (input == "PING") {
      Serial.println("PONG");
    } else if (input.startsWith("upperlimit ")) {
      String posStr = input.substring(12);
      upper_voltage_limit = posStr.toFloat();

    } else if (input.startsWith("lowerlimit ")) {
      String posStr = input.substring(12);
      lower_voltage_limit = posStr.toFloat();

    } else {
      Serial.print("Unknown command: ");
      Serial.println(input);
      Serial.println("Available commands: position <value>, open, close, hold, measure, PING");
    }
  }
}

//as it's name implies it opens the gripper
void opengripper() {
  if (false) {//alternative way but not used for final version
    output = lower_voltage_limit;
    target_voltage = lower_voltage_limit;
    delay(500);
    output = 0;
    target_voltage = 0;
    distance = 100;
  }
  if (true) { //opens using advanced positional controll techniques and stops at a point before disengaging gears
    motor.controller = MotionControlType::angle_openloop;
    motor.move(90);
    output = 0;
    target_voltage = 0;
    distance = 100;
  }
}

// closes gripper
void closegripper() {
  if (true) {
    motor.controller = MotionControlType::torque;//switch to advanced torque controll technique
  }
  //stops at a force threshhold in order to not break objects
  if (abs(y) + abs(z) > abs(forcethreshhold)) {  //z < forcethreshhold) {
    target_voltage = 0;
    //output = -3;
    //distance = 10;
    //return;
  } else {
    distance = 0;
    // output=upper_voltage_limit;
    target_voltage = upper_voltage_limit;  //computePIDOutput(z);//if you want to use PID ;-)
  }
}

void holdgripper() {//stops motors
  //output = 0;
  target_voltage = 0;
}
//sends all the iportant system states to the GUI for visualization
void sendStates() {
  // print the magnetic field data
  //x,y,z,output,distance,
  Serial.print(x);
  Serial.print(",");

  Serial.print(y);
  Serial.print(",");

  Serial.print(z);
  Serial.print(",");
  Serial.print(target_voltage);

  Serial.print(",");
  double d = getDistanceM();
  Serial.print(d);  //distance);
  Serial.println("");
}