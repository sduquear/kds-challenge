import { Controller, Post, Get } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Simulation')
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current simulation status' })
  getStatus() {
    return this.simulationService.getStatus();
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Start or stop the automatic order generation' })
  toggle() {
    return this.simulationService.toggleSimulation();
  }
}
