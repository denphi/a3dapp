
import re
import math

class CodeReader:
    def __init__(self, gcode):
        self.rawcode = gcode.splitlines()  # The Raw Code input from the code
        self.code = []  # Cleaned up code for further processing
        self.len_of_code = 0  # Number of lines in the cleaned up code
        self.len_units = 1  # mm or inches for the distances and velocity
        self.pos = [0, 0, 0]  # Current Position
        self.velocity = 1  # Current Velocity
        self.time = 0  # Current time
        self.Pparam = 0  # Type of Feature: Infill, Solid Layer
        self.R = 0  # Dynamic control Speed Limit for CAMRI
        # Switches for Printer/Extruder/Cooling_Fan
        self.switches = [0.0, 0.0, 0.0]
        # Maximum Dimensions of the printed part
        self.MaxDims = [0.0, 0.0, 0.0]
        self.MinZ = 0  # The Z-offset for the first layer of the print
        self.bead_width = 0  # Dynamically Controlled Bead Width
        self.bead_height = 0  # Dynamically Controlled Bead Height
        self.flags = [0, 0, 0]  # Build/Unit/Abs and Rel Coordinate Flag
        self.buffer = 150  # Size of the buffer

    def default_units(self):
        return 1

    '''Removes all the lines which doesn't start with 'G
    or 'M' and stores them in the class variable code[]
    Also adds a space to the end of the line for the CAMRI system
    or '(' in the end of the BAAM system to avoid Traceback error'''

    def remove_blank(self):
        lines = []
        for i,line in enumerate(self.rawcode):
            if (line != ""):
                lines.append(line)
        return lines

    '''Sets the Working units for the codes based on the G90/G91 distinction
    between the Absolute and Relative Coordinates
    And G20/G21 for inches and mm. If these codes are not given, its assumed based
    on the type of printer being used.'''

    def code_units(self):
        self.flags[1] = 0  # Used to check the presence of G20/G21
        for i, line in enumerate(self.code):
            gcode, comment = self.code_seperation(line)
            if (gcode[0] == 'G20'):  # Units in Inches
                self.len_units = 25.4  # Multiplier for Inches
                self.flags[1] = 1
            elif (gcode[0] == 'G21'):  # Units in mm
                self.len_units = 1  # Multiplier for mm
                self.flags[1] = 1
            elif (gcode[0] == 'G91'):  # Relative Coordinates
                self.flags[2] = 1
            elif (gcode[0] == 'G90'):  # Absolute Coordinates
                self.flags[2] = 0

            if (self.flags[1] == 0):
                self.len_units = self.default_units()

    '''This function takes input as the comment in the case of the BAAM system
    or the M111/M117/M118/M119 inputs in the case of the CAMRI system and updates
    the type of features accordingly'''

    '''this function parses the entire code once after code cleanup and
    finds the maximum X,Y,Z dimensions and the minimum Z
    to use for tranforming the part for the BAAM system and
    offsetting the bottom surface to Z = 0 '''

    def max_dimensions(self):
        for index, obj in enumerate(self.code):
            gcode, comment = self.code_seperation(obj)

            self.coord_and_vel(gcode)
            if (self.Pparam > 0 and self.flags[0] == 0):
                self.MinZ = abs(self.pos[2])
                self.flags[0] = 1
            self.type_of_feature(gcode, comment)
            if (self.pos[0] > self.MaxDims[0] and self.flags[0] == 1):
                self.MaxDims[0] = self.pos[0]
            if (self.pos[1] > self.MaxDims[1] and self.flags[0] == 1):
                self.MaxDims[1] = self.pos[1]
            if (self.pos[2] > abs(self.MaxDims[2]) and self.flags[0] == 1):
                self.MaxDims[2] = self.pos[2]

    '''This function takes input the index of the line in the code and
    calculates the distance based on the difference from the next line in the code.
    It then calculates the time based on the velocity'''

    def distance(self, index):
        gcode1 , comment1  = self.code_seperation(self.code[index])
        self.coord_and_vel(gcode1)
        x1 = self.pos[0]
        y1 = self.pos[1]
        z1 = self.pos[2]
        plane_distance = 0
        if index < self.len_of_code - 1:
            gcode2, comment2 = self.code_seperation(self.code[index + 1])
            self.coord_and_vel(gcode2)
            plane_distance = math.sqrt(
                ((self.pos[0] - x1) ** 2.) + ((self.pos[1] - y1) ** 2.)) * self.len_units

        if (self.flags[2] == 0):
            length = math.sqrt(((self.pos[0] - x1) ** 2.) + (
                (self.pos[1] - y1) ** 2.) + ((self.pos[2] - z1) ** 2.)) * self.len_units
        elif (self.flags[2] == 1):
            length = math.sqrt(
                (self.pos[0] ** 2.) + (self.pos[1] ** 2.) + (self.pos[2] ** 2.)) * self.len_units
        else:
            length = 0

        new_time = length * 60 / (self.velocity * self.len_units)
        self.time += new_time
        return new_time, plane_distance

    ''' Runs all the other functions and then writes the event series into a file '''

    def write_to_file(self):
        self.clean_code()
        self.code_units()
        self.max_dimensions()
        self.Pparam = 0
        lines = []
        ESline = ""
        time_flag = 0
        new_time = 0
        plane_distance = 0
        t1 = 0
        for index, line in enumerate(self.code):
            ESline, new_time, time_flag, plane_distance, t1 = self.process_line(
                index, line, time_flag, t1)
            if (new_time > 0.0001 and plane_distance > 0 and self.Pparam > 0):
                lines.append(ESline)

        return lines




class CAMRIReader(CodeReader):
    
    def clean_code(self):
        lines = self.remove_blank(); ## Removing all the blank lines
        for line in lines:
            if (line[0] == 'G' or line[0] == 'M'):
                self.code.append(line);

        for index, line in enumerate(self.code):
            self.code[index] = line.rstrip('\n') + ' '
        
        self.len_of_code = len(self.code);
    

    def code_seperation(self, line):
        gcode = re.split("\\s", line)
        return gcode, '';


    def print_condition(self, gcode):
        if gcode[0] == 'G1':
            self.switches[0] = 1;
        elif gcode[0] == 'G0':
            self.switches[0] = 0;


    def coord_and_vel(self, gcode):
        gcode_sep = re.split('([A-Z])', " ".join(gcode))
        for index, obj in enumerate (gcode_sep):
            if (obj == 'F'):
                self.velocity = float(gcode_sep[index + 1])
            if obj == 'X':
                self.pos[0] = float(gcode_sep[index + 1])
            elif obj == 'Y':
                self.pos[1] = float(gcode_sep[index + 1])
            elif obj == 'Z':
                self.pos[2] = float(gcode_sep[index + 1])
                if self.pos[2] > 0:
                    self.pos[2] -= self.MinZ;
   

    def type_of_feature(self, gcode, comment):
        gcode_sep = re.split('([A-Z])', " ".join(gcode))
        for index, obj in enumerate(gcode_sep):
            if (obj == 'M'):
                MCode = int(gcode_sep[index + 1])
                if (MCode == 117):
                    self.Pparam = 3
                elif MCode == 118:
                    self.Pparam = 2
                elif MCode == 119:
                    self.Pparam = 1
                elif MCode == 111:
                    self.Pparam = 4

    def extruder_status(self, gcode):
        if gcode[0] == 'M03':
            self.switches[1] = 1
        elif gcode[0] == 'M05':
            self.switches[1] = 0


    def cooling_fan_status(self, gcode):
        if gcode[0] == 'M109':
            self.switches[2] = 1
        elif gcode[0] == 'M110':
            self.switches[2] = 0


    def bead_dimensions(self, gcode):
        if gcode[0] == 'M100' or gcode[0] == 'M104':
            gcode_sep = re.split('([A-Z])', " ".join(gcode))
            for index, obj in enumerate(gcode_sep):
                if (obj == 'P'):
                    self.bead_width = float(gcode_sep[index + 1]);
                elif (obj == 'Q'):
                    self.bead_height = float(gcode_sep[index + 1]);
                elif (obj == 'R'):
                    self.R = float(gcode_sep[index + 1]);


    def process_line(self, index, line, time_flag, t1):
        gcode, comment = self.code_seperation(line);
        self.print_condition(gcode);
        self.bead_dimensions(gcode);
        self.extruder_status(gcode);
        self.cooling_fan_status(gcode);
        self.type_of_feature(gcode, comment);
        new_time, plane_distance = self.distance(index);
        if ((self.pos[0] < 0 or self.pos[1] < 0 or self.pos[2] < 0) and self.Pparam == 0):
            self.time = 0;
        
        if (self.pos[0] > 0 and plane_distance > 0 and self.Pparam > 0 and time_flag == 0):
            t1 = self.time;
            time_flag = 1;
            
        ESline = repr(round(self.time - t1, 4)) + ',' + repr(round(self.pos[0] * self.len_units, 3)) + ',' + repr(round(self.pos[1] * self.len_units, 3)) + ',' + repr(round(self.pos[2] * self.len_units, 3)) + ',' + repr(self.switches[0]) + ',' + repr(self.Pparam);
        ESline = ESline + ',' + repr(self.switches[1]) + ',' + repr(self.switches[2])
        return ESline, new_time, time_flag, plane_distance, t1



class BAAMReader(CodeReader):
    def clean_code(self) :
        lines = self.remove_blank(); #Removing all the blank lines
        for line in lines:
            if line[0] == 'G' or line[0] == 'M':
                self.code.append(line);

        for index, line in  enumerate(self.code) :
            self.code[index] = line.rstrip('\n') + ' '

        self.len_of_code = len(self.code);
    

    def default_units(self ):
        return 25.4;
    

    def code_seperation(self, line):
        comment = '';
        gcode = '';
        c1 = line.find('(')
        if c1 > -1:
            c2 = line.rfind(')')
            if c2 > -1:
                gcode = (line[0:c1].strip() + ' ' + line[c2 + 1:].strip()).strip()
                comment = line[c1 + 1:c2].strip()

        gcode = re.split("\\s", gcode)
        return gcode, comment


    '''Seperates the gcode into the code and comment parts
    This is done on the basis of the brackets present in the comment
    The Gcode is then converted to a list for easy parsing
    the Gcode as a list and the comment as a string is returned from the function"""'''

    def print_condition(self, gcode):
        if gcode[0] == 'M3':
            self.switches[0] = 1
        elif (gcode[0] == 'M5'):
            self.switches[0] = 0

    def coord_and_vel(self, gcode):
        gcode_sep = re.split('([A-Z])', " ".join(gcode))
        for index, obj in enumerate(gcode_sep):
            if (obj == 'F'):
                self.velocity = float(gcode_sep[index + 1]);
            if (obj == 'X'):
                self.pos[0] = float(gcode_sep[index + 1]);
            elif (obj == 'Y'):
                self.pos[1] = float(gcode_sep[index + 1]);
            elif (obj == 'W'):
                self.pos[2] = float(gcode_sep[index + 1]) * -1;
                if (self.pos[2] > 0):
                    self.pos[2] -= self.MinZ;


    def type_of_feature(self, gcode, comment):
        if (comment == 'VOLUME-INFILL'):
            self.Pparam = 1;
        elif (comment == 'VOLUME-WALL_INNER'):
            self.Pparam = 2;
        elif (comment == 'VOLUME-WALL_OUTER'):
            self.Pparam = 3;


    def extruder_status(self, gcode):
        pass

    def cooling_fan_status(self, gcode):
        pass

    def process_line(self, index, line, time_flag, t1):
        gcode, comment = self.code_seperation(line);
        self.print_condition(gcode);
        self.type_of_feature(gcode, comment);
        new_time, plane_distance = self.distance(index);
        self.pos[0] = self.pos[0] * -1 + self.MaxDims[0];
        if (self.pos[0] > 0 and plane_distance > 0 and self.Pparam > 0 and time_flag == 0):
            t1 = self.time;
            time_flag = 1;
        
        ESline = repr(round(self.time - t1, 4)) + ',' + repr(round(self.pos[0] * self.len_units, 3)) + ',' + repr(round(self.pos[1] * self.len_units, 3)) + ',' + repr(round(self.pos[2] * self.len_units, 3)) + ',' + repr(self.switches[0]) + ',' + repr(self.Pparam);
        return ESline, new_time, time_flag, plane_distance, t1




class LSAMReaderNew(CodeReader):

    def clean_code(self):
        LSAM_Z_ADJ = 0.0
        LSAM_M3_S = 0.0
        LSAM_M3_F = 0.0
        LSAM_M5_S = 0.0
        LSAM_M5_F = 0.0
        LSAM_M3_FpLSAM_M3_XF = 0.0

        self.len_of_code = len(self.code)
        lines = self.remove_blank()  # Removing all the blank lines
        for i, line in enumerate(lines):
            # uppercase and strip white space
            line_mod = line.upper().strip()
            # if line_mod: means we'll only do this thing if the line is still non-empty
            if line_mod:
                line_mod = line_mod.replace('[OPRMSG]', '')
                line_mod = line_mod.replace('[TIMERLAP]', '')
                line_mod = line_mod.replace('[ENDREGION]', '')
                line_mod = line_mod.replace('[TIMERSTOP]', '')
                line_mod = line_mod.replace('[LSAM_Z_ADJ]', str(LSAM_Z_ADJ))
                line_mod = line_mod.replace('[LSAM_M3_S]', str(LSAM_M3_S))
                line_mod = line_mod.replace('[LSAM_M3_F]', str(LSAM_M3_F))
                line_mod = line_mod.replace('[LSAM_M5_S]', str(LSAM_M5_S))
                line_mod = line_mod.replace('[LSAM_M5_F]', str(LSAM_M5_F))
                line_mod = line_mod.replace(
                    '[LSAM_M3_F+LSAM_M3_XF]', str(LSAM_M3_FpLSAM_M3_XF))
                # who knows if this is correct
                line_mod = line_mod.replace('%M48', 'M48')
                line_mod = line_mod.strip()

            if (line_mod.startswith('[OPRMSG(')):
                temp = re.match('\[OPRMSG\(1,"Print Layer: ([0-9]+) of ([0-9]+)",2,RGB\(70,145,205\)\)\]', line_mod, re.IGNORECASE);
                if (temp is not None):
                    line_mod = ';layer ' + str(int(temp.group(1)) - 1)               
                #temp = parse(
                #    '[OPRMSG(1,"Print Layer: {} of {}",2,RGB(70,145,205))]', line_mod)
                #if (temp):
                #    line_mod = ';layer %d' % (int(temp[0]) - 1)
            
            # replace region lines with simpler line for later
            if line_mod.startswith('[BEGINREGION('):
                temp = re.match('\[BEGINREGION\(([0-9]+)\)\])', line_mod, re.IGNORECASE);
                if (temp is not None):
                    line_mod = ';region ' + str(int(temp.group(1)))
                #temp = parse('[BEGINREGION({})]', line_mod)
                #line_mod = ';region %d' % int(temp[0])

            # get rid of comments
            if line_mod:
                i0 = line_mod.find('(')
                if i0 > -1:
                    i1 = line_mod.find(')')
                    if i1 > i0:
                        line_mod = line_mod[:i0] + line_mod[i1+1:]
                line_mod = line_mod.strip()

            # if the line just starts with X Y or Z assume it's a G1

            if line_mod.startswith('X'):
                line_mod = 'G1 ' + line_mod
            if line_mod.startswith('Y'):
                line_mod = 'G1 ' + line_mod
            if line_mod.startswith('Z'):
                line_mod = 'G1 ' + line_mod
            if line_mod.startswith('G14'):
                line_mod = 'G14 ' + line_mod[3:]
            if line_mod.startswith('T'):
                line_mod = 'T ' + line_mod[1:]
            if line_mod:
                line_mod = line_mod.replace(' M', '\nM')
                line_mod = line_mod.replace(' G', '\nG')
                #    line_mod = line_mod.replace(' ;', '\n;')

            if (line_mod != ""):
                for lm in line_mod.split("\n"):
                    self.code.append(lm)

        self.len_of_code = len(self.code)

    def code_seperation(self, line):
        gc = re.split("\\s", line)
        return gc, ''

    def write_to_file(self):
        self.clean_code()
        UNKNOWN_CODES = [
            'G15.2',  # no idea what this should be parsed to
            'G25A',  # probably needs to be parsed to G25 A
            'G52L0',  # Clear Offsets - probably needs to be parsed to G52 L0
            'G52L?',  # probably needs to be parsed to G52 L?
            'G52L33',  # probably needs to be parsed to G52 L?
            'G66',
            'G66~',
            'G66A',  # probably needs to be parsed to G66 A
            'G315',
            'G990',
            'G52L2',  # Set Fixture Offset
            'G52L1',  # Set Fixture Offset
            'G52L5',  # Set Fixture Offset
            'G312',  # LSAM_Z_ADJ Macro
        ]
        KNOWN_CODES = [
            'G300',
            'G310',
            'G311',
            'M48',
            'T1',
            'G54',
            'G14',
            'T'
        ]
        # const floatString = (n) => Number.isInteger(n) ? n.toFixed(1) : n.toString();
        lines = []
        # initialize calculating value
        T = 0.  # time
        X = 0.  # x
        Y = 0.  # y
        Z = 0.  # z
        L = 0  # layer number
        F = 0.  # feedrate
        P = 0.  # laser on or off (i.e. power on or off)
        Reg = 0  # region flag (not fully supported yet)
        T_new = 0.
        X_new = 0.
        Y_new = 0.
        Z_new = 0.
        F_new = 0.
        P_new = 0.
        relative_position = 0.0
        dscale = 0.0
        print_update = False
        first_movement = True
        # 25.4*24./60. # need to update for LSAM ¯\_(ツ)_/¯
        default_fast_movement_speed = 2400.0
        tscale = 60.  # default time unit is min (in/min or mm/min)
        overideFeed = 460.0  # (in/min) used to override feedspeed F~99999.99
        # deadtime_endsegment =6.472 # dead time after printing a loop (Curvedwedge)
        # dead time after printing a loop (plate)
        deadtime_endsegment = 7.402930233
        ES_location = 'top'
        bead_h = 0.2  # inches
        feature_ow = 3.0

        # loop over the gcode
        for i, line in enumerate(self.code):
            # a comment can only change "layer number"
            if (line.startswith(';')):
                if (line.startswith(';layer')):
                    L = int(line[6:])
                elif (line.startswith(';region')):
                    Reg = int(line[7:])

            elif (line != ""):
                gcode, comment = self.code_seperation(line)
                if (gcode[0] == 'G17'):
                    pass  # Printing in XY Plane
                elif (gcode[0] == 'G18'):
                    pass  # Printing in ZX Plane (not supported)
                elif (gcode[0] == 'G19'):
                    pass  # Printing in YZ Plane (not supported)
                elif (gcode[0] == 'G90'):  # Absolute Positioning
                    relative_position = 0.0
                elif (gcode[0] == 'G91'):  # Relative Positioning
                    relative_position = 1.0
                elif (gcode[0] == 'G70'):  # Distance in inches
                    dscale = 25.4
                elif (gcode[0] == 'M3'):
                    P = 1
                    print_update = True
                elif (gcode[0] == 'M5'):
                    P = 0
                    print_update = True
                elif (gcode[0] == 'G94'):  # Feedrate Mode in units/min
                    pass
                    # tscale = 60.0 #this is the only was we support F currently
                elif (gcode[0] == 'G0'):  # fast movement
                    # update new for the case that the gcode line doesn't update them
                    X_new = X
                    Y_new = Y
                    Z_new = Z
                    F_new = dscale*default_fast_movement_speed/tscale
                    for part in gcode[1:]:
                        if part.startswith('X'):
                            X_new = relative_position *                                 X + dscale*float(part[1:])
                        elif part.startswith('Y'):
                            Y_new = relative_position *                                 Y + dscale*float(part[1:])
                        elif part.startswith('Z'):
                            Z_new = relative_position *                                 Z + dscale*float(part[1:])
                            if ES_location == 'top':
                                Z_new = Z_new-bead_h*dscale
                        elif part.startswith('F'):
                            if part.find('~') > -1:
                                print('F overriden to F=' +
                                      str(overideFeed)+' in/min')
                                F_new = dscale*overideFeed/tscale
                            else:
                                F_new = dscale*float(part[1:])/tscale
                        elif part.startswith('A'):
                            T = T  # print('G0 with A. :-/')
                        elif part.startswith('B'):
                            T = T  # print('G0 with A. :-/')
                        elif part.startswith('C'):
                            T = T  # print('G0 with A. :-/')
                        else:
                            T = T  # print(part)
                            raise ValueError('unsupported line')
                    # let init_V = F; # not used
                    # let end_V = F_new# not used
                    ave_V = (F + F_new)/2.0
                    distance = math.pow(
                        math.pow(X_new-X, 2) + math.pow(Y_new-Y, 2) + math.pow(Z_new-Z, 2), 0.5)
                    time_inc = distance/ave_V
                    T_new = T + time_inc
                    T = T_new
                    X = X_new
                    Y = Y_new
                    Z = Z_new
                    F = F_new
                    if (first_movement == True):
                        T = 0.0
                        first_movement = False
                    # set speed back to feed speed (G0 is not modal or sticky)
                    F = dscale*overideFeed/tscale
                    print_update = True
                elif (gcode[0] == 'G1'):  # print movement
                    # update new for the case that the gcode line doesn't update them
                    X_new = X
                    Y_new = Y
                    Z_new = Z
                    F_new = F
                    # update those from the gcode line
                    for part in gcode[1:]:
                        if part.startswith('X'):
                            X_new = relative_position *                                 X + dscale*float(part[1:])
                        elif part.startswith('Y'):
                            Y_new = relative_position *                                 Y + dscale*float(part[1:])
                        elif part.startswith('Z'):
                            Z_new = relative_position *                                 Z + dscale*float(part[1:])
                            if ES_location == 'top':
                                Z_new = Z_new-bead_h*dscale
                        elif part.startswith('F'):
                            if part.find('~') > -1:
                                # print('F overriden to F='+str(overideFeed)+' in/min')
                                T = T
                                F_new = dscale*overideFeed/tscale
                            else:
                                F_new = dscale*float(part[1:])/tscale
                        elif part.startswith('A'):
                            T = T  # print('G4 with A. :-/')
                        elif part.startswith('B'):
                            T = T  # print('G4 with A. :-/')
                        elif part.startswith('C'):
                            T = T  # print('G4 with A. :-/')
                        else:
                            T = T  # print(part)
                            raise ValueError('unsupported line')
                    # let init_V = F
                    # let end_V = F_new
                    ave_V = (F + F_new)/2.
                    distance = math.pow(
                        math.pow(X_new-X, 2) + math.pow(Y_new-Y, 2) + math.pow(Z_new-Z, 2), 0.5)
                    time_inc = distance/ave_V
                    T_new = T + time_inc
                    T = T_new
                    X = X_new
                    Y = Y_new
                    Z = Z_new
                    F = F_new
                    if (first_movement == True):
                        T = 0.0
                        first_movement = False

                    print_update = True
                elif (gcode[0] == 'G4'):
                    T_new = T
                    for part in gcode[1:]:
                        if part.startswith('F'):
                            T_new = T + float(part[1:])
                        else:
                            T = T  # print(part)
                            raise ValueError('unsupported line')
                    T = T_new
                    print_update = True
                elif (gcode[0] == 'G66'):
                    T_new = T + deadtime_endsegment
                    T = T_new
                    # print('G66 - deadtime ='+str(deadtime_endsegment)+' s')
                    T = T
                    print_update = True
                    if first_movement == True:
                        T = 0.
                        first_movement = False
                        print_update = False
                elif gcode[0] == 'M02':
                    # PROGRAM END
                    break
                elif gcode[0] in KNOWN_CODES:
                    # known, but no known action
                    # unknown or ineffective, pass
                    print_update = False
                elif gcode[0] in UNKNOWN_CODES:
                    # unknown code
                    print_update = False
                else:
                    # not dealt with yet: %s: %s
                    break
                if (print_update):
                    ESline = repr(round(T, 4)) + ',' + repr(round(X, 3)) + ',' + repr(
                        round(Y, 3)) + ',' + repr(round(Z, 3)) + ',' + repr(P) + ',' + repr(feature_ow)
                    lines.append(ESline)
        return lines




class LSAMReaderNew(CodeReader):

    def clean_code(self):
        LSAM_Z_ADJ = 0.0
        LSAM_M3_S = 0.0
        LSAM_M3_F = 0.0
        LSAM_M5_S = 0.0
        LSAM_M5_F = 0.0
        LSAM_M3_FpLSAM_M3_XF = 0.0

        self.len_of_code = len(self.code);
        lines = self.remove_blank();  # Removing all the blank lines
        for i, line in enumerate(lines):
            #uppercase and strip white space
            line_mod = line.upper().strip()
            #if line_mod: means we'll only do this thing if the line is still non-empty
            if line_mod:
                line_mod = line_mod.replace('[OPRMSG]', '')
                line_mod = line_mod.replace('[TIMERLAP]', '')
                line_mod = line_mod.replace('[ENDREGION]', '')
                line_mod = line_mod.replace('[TIMERSTOP]', '')
                line_mod = line_mod.replace('[LSAM_Z_ADJ]', str(LSAM_Z_ADJ))
                line_mod = line_mod.replace('[LSAM_M3_S]', str(LSAM_M3_S))
                line_mod = line_mod.replace('[LSAM_M3_F]', str(LSAM_M3_F))
                line_mod = line_mod.replace('[LSAM_M5_S]', str(LSAM_M5_S))
                line_mod = line_mod.replace('[LSAM_M5_F]', str(LSAM_M5_F))
                line_mod = line_mod.replace(
                    '[LSAM_M3_F+LSAM_M3_XF]', str(LSAM_M3_FpLSAM_M3_XF))
                # who knows if this is correct
                line_mod = line_mod.replace('%M48', 'M48')
                line_mod = line_mod.strip()


            # replace the operator message with a simpler line for indicating layer number
            # have to do this before we get rid of other comment lines ()
            if (line_mod.startswith('[OPRMSG(')):
                temp = re.match('\[OPRMSG\(1,"Print Layer: ([0-9]+) of ([0-9]+)",2,RGB\(70,145,205\)\)\]', line_mod, re.IGNORECASE);
                if (temp is not None):
                    line_mod = ';layer ' + str(int(temp.group(1)) - 1)               
                #temp = parse(
                #    '[OPRMSG(1,"Print Layer: {} of {}",2,RGB(70,145,205))]', line_mod)
                #if (temp):
                #    line_mod = ';layer %d' % (int(temp[0]) - 1)
            
            # replace region lines with simpler line for later
            if line_mod.startswith('[BEGINREGION('):
                temp = re.match('\[BEGINREGION\(([0-9]+)\)\]', line_mod, re.IGNORECASE);
                if (temp is not None):
                    line_mod = ';region ' + str(int(temp.group(1)))
                #temp = parse('[BEGINREGION({})]', line_mod)
                #line_mod = ';region %d' % int(temp[0])

            #get rid of comments
            if line_mod:
                i0 = line_mod.find('(')
                if i0 > -1:
                    i1 = line_mod.find(')')
                    if i1 > i0:
                        line_mod = line_mod[:i0] + line_mod[i1+1:]
                line_mod = line_mod.strip()

            # if the line just starts with X Y or Z assume it's a G1

            if line_mod.startswith('X'):
                    line_mod = 'G1 ' + line_mod
            if line_mod.startswith('Y'):
                line_mod = 'G1 ' + line_mod
            if line_mod.startswith('Z'):
                line_mod = 'G1 ' + line_mod
            if line_mod.startswith('G14'):
                line_mod = 'G14 ' + line_mod[3:]
            if line_mod.startswith('T'):
                line_mod = 'T ' + line_mod[1:]
            if line_mod:
                line_mod = line_mod.replace(' M', '\nM')
                line_mod = line_mod.replace(' G', '\nG')
                #    line_mod = line_mod.replace(' ;', '\n;')

            if (line_mod != ""):
                for lm in line_mod.split("\n"):
                    self.code.append(lm);

        self.len_of_code = len(self.code);

    def code_seperation(self, line):
        gc = re.split("\\s", line)
        return gc, ''


    def write_to_file(self):
        self.clean_code();
        UNKNOWN_CODES = [
            'G15.2',  # no idea what this should be parsed to
            'G25A',  # probably needs to be parsed to G25 A
            'G52L0',  # Clear Offsets - probably needs to be parsed to G52 L0
            'G52L?',  # probably needs to be parsed to G52 L?
            'G52L33',  # probably needs to be parsed to G52 L?
            'G66',
            'G66~',
            'G66A',  # probably needs to be parsed to G66 A
            'G315',
            'G990',
            'G52L2',  # Set Fixture Offset
            'G52L1',  # Set Fixture Offset
            'G52L5',  # Set Fixture Offset
            'G312',  # LSAM_Z_ADJ Macro
        ]
        KNOWN_CODES = [
            'G300',
            'G310',
            'G311',
            'M48',
            'T1',
            'G54',
            'G14',
            'T'
        ]
        #const floatString = (n) => Number.isInteger(n) ? n.toFixed(1) : n.toString();
        lines = []
        # initialize calculating value
        T = 0.  # time
        X = 0.  # x
        Y = 0.  # y
        Z = 0.  # z
        L = 0  # layer number
        F = 0.  # feedrate
        P = 0.  # laser on or off (i.e. power on or off)
        Reg = 0  # region flag (not fully supported yet)
        T_new = 0.
        X_new = 0.
        Y_new = 0.
        Z_new = 0.
        F_new = 0.
        P_new = 0.
        relative_position = 0.0
        dscale = 0.0
        print_update = False
        first_movement = True
        # 25.4*24./60. # need to update for LSAM ¯\_(ツ)_/¯
        default_fast_movement_speed = 2400.0
        tscale = 60.  # default time unit is min (in/min or mm/min)
        overideFeed = 460.0  # (in/min) used to override feedspeed F~99999.99
        #deadtime_endsegment =6.472 # dead time after printing a loop (Curvedwedge)
        # dead time after printing a loop (plate)
        deadtime_endsegment = 7.402930233
        ES_location = 'top'
        bead_h = 0.2  # inches
        feature_ow = 3.0

        # loop over the gcode
        for i, line in enumerate(self.code):
            # a comment can only change "layer number"
            if (line.startswith(';')):
                if (line.startswith(';layer')):
                    L = int(line[6:])
                elif (line.startswith(';region')):
                    Reg = int(line[7:])

            elif (line != ""):
                gcode, comment = self.code_seperation(line)
                if (gcode[0] == 'G17'):
                    pass #Printing in XY Plane
                elif (gcode[0] == 'G18'):
                    pass #Printing in ZX Plane (not supported)
                elif (gcode[0] == 'G19'):
                    pass #Printing in YZ Plane (not supported)
                elif (gcode[0] == 'G90'):  # Absolute Positioning
                    relative_position = 0.0;
                elif (gcode[0] == 'G91'):  # Relative Positioning
                    relative_position = 1.0;
                elif (gcode[0] == 'G70'):  # Distance in inches
                    dscale = 25.4;
                elif (gcode[0] == 'M3'):
                    P = 1;
                    print_update = True
                elif (gcode[0] == 'M5'):
                    P = 0;
                    print_update = True
                elif (gcode[0] == 'G94'):  # Feedrate Mode in units/min
                    pass
                    #tscale = 60.0 #this is the only was we support F currently
                elif (gcode[0] == 'G0'):  # fast movement
                    #update new for the case that the gcode line doesn't update them
                    X_new = X;
                    Y_new = Y;
                    Z_new = Z;
                    F_new = dscale*default_fast_movement_speed/tscale
                    for part in gcode[1:]:
                        if part.startswith('X'):
                            X_new = relative_position *                                 X + dscale*float(part[1:])
                        elif part.startswith('Y'):
                            Y_new = relative_position *                                 Y + dscale*float(part[1:])
                        elif part.startswith('Z'):
                            Z_new = relative_position *                                 Z + dscale*float(part[1:])
                            if ES_location == 'top':
                                Z_new = Z_new-bead_h*dscale
                        elif part.startswith('F'):
                            if part.find('~') > -1:
                                print('F overriden to F=' +                                       str(overideFeed)+' in/min')
                                F_new = dscale*overideFeed/tscale
                            else:
                                F_new = dscale*float(part[1:])/tscale
                        elif part.startswith('A'):
                            T = T;  # print('G0 with A. :-/')
                        elif part.startswith('B'):
                            T = T;  # print('G0 with A. :-/')
                        elif part.startswith('C'):
                            T = T;  # print('G0 with A. :-/')
                        else:
                            T = T;  # print(part)
                            raise ValueError('unsupported line')
                    #init_V = F; # not used
                    #end_V = F_new# not used
                    ave_V = (F + F_new)/2.0;
                    distance = math.pow(
                        math.pow(X_new-X, 2) + math.pow(Y_new-Y, 2) + math.pow(Z_new-Z, 2), 0.5)
                    time_inc = distance/ave_V
                    T_new = T + time_inc
                    T = T_new
                    X = X_new
                    Y = Y_new
                    Z = Z_new
                    F = F_new
                    if (first_movement is True):
                        T = 0.0
                        first_movement = False
                    # set speed back to feed speed (G0 is not modal or sticky)
                    F = dscale*overideFeed/tscale
                    print_update = True
                elif (gcode[0] == 'G1'):  # print movement
                    #update new for the case that the gcode line doesn't update them
                    X_new = X
                    Y_new = Y
                    Z_new = Z
                    F_new = F
                    #update those from the gcode line
                    for part in gcode[1:]:
                        if part.startswith('X'):
                            X_new = relative_position *                                 X + dscale*float(part[1:])
                        elif part.startswith('Y'):
                            Y_new = relative_position *                                 Y + dscale*float(part[1:])
                        elif part.startswith('Z'):
                            Z_new = relative_position *                                 Z + dscale*float(part[1:])
                            if ES_location == 'top':
                                Z_new = Z_new-bead_h*dscale
                        elif part.startswith('F'):
                            if part.find('~') > -1:
                                # print('F overriden to F='+str(overideFeed)+' in/min')
                                T = T;
                                F_new = dscale*overideFeed/tscale
                            else:
                                F_new = dscale*float(part[1:])/tscale
                        elif part.startswith('A'):
                            T = T;  # print('G4 with A. :-/')
                        elif part.startswith('B'):
                            T = T;  # print('G4 with A. :-/')
                        elif part.startswith('C'):
                            T = T;  # print('G4 with A. :-/')
                        else:
                            T = T;  # print(part)
                            raise ValueError('unsupported line')
                    #let init_V = F
                    #let end_V = F_new
                    ave_V = (F + F_new)/2.
                    distance = math.pow(
                        math.pow(X_new-X, 2) + math.pow(Y_new-Y, 2) + math.pow(Z_new-Z, 2), 0.5);
                    time_inc = distance/ave_V
                    T_new = T + time_inc
                    T = T_new
                    X = X_new
                    Y = Y_new
                    Z = Z_new
                    F = F_new
                    if (first_movement is True):
                        T = 0.0
                        first_movement = False

                    print_update = True
                elif (gcode[0] == 'G4'):
                    T_new = T
                    for part in gcode[1:]:
                        if part.startswith('F'):
                            T_new = T + float(part[1:])
                        else:
                            T = T;  # print(part)
                            raise ValueError('unsupported line')
                    T = T_new
                    print_update = True
                elif (gcode[0] == 'G66'):
                    T_new = T + deadtime_endsegment
                    T = T_new
                    # print('G66 - deadtime ='+str(deadtime_endsegment)+' s')
                    T = T
                    print_update = True
                    if first_movement == True:
                        T = 0.
                        first_movement = False
                        print_update = False
                elif gcode[0] == 'M02':
                    #PROGRAM END
                    break;
                elif gcode[0] in KNOWN_CODES:
                    #known, but no known action
                    #unknown or ineffective, pass
                    print_update = False
                elif gcode[0] in UNKNOWN_CODES:
                    #unknown code
                    print_update = False
                else:
                    #not dealt with yet: %s: %s
                    break;
                if (print_update):
                    ESline = repr(round(T, 4)) + ',' + repr(round(X, 3)) + ',' + repr(round(Y, 3)) + ',' + repr(round(Z, 3)) + ',' + repr(P) + ',' + repr(feature_ow);
                    lines.append(ESline)
        return lines


# In[ ]:


class TSReader (CodeReader) :
    def clean_code(self) :
        self.code = self.remove_blank();

    def code_seperation(self, line) :
        gcode = re.split("\\s", line) #line.split(/[\s]+/); ;
        return gcode, ''

    def print_condition(self, gcode):
        pass

    def coord_and_vel(self, gcode):
        pass
    
    def type_of_feature(self, gcode, comment) :
        self.Pparam = 1
    
    
    def extruder_status(self, gcode):
        pass
    
    def cooling_fan_status(self, gcode):
        pass
    
    def process_line(self, index, line, time_flag, t1):
        self.type_of_feature(line, '')
        return line, 1, 1, 1, t1


class ReaderFactory :
    def build(machine, code):
        reader = None;
        if (machine == "TS"):
            reader = TSReader(code);
        elif (machine == "BAAM"):
            reader = BAAMReader(code);
        elif (machine == "LSAM"):
            reader = LSAMReaderNew(code);
        elif (machine == "LSAMold"):
            reader = LSAMReader(code); #Old Parser
        elif (machine == "CAMRI"):
            reader = CAMRIReader(code);
        else:
            raise Exception("Machine is not valid");
        
        return reader;

