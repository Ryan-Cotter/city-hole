# City object catalog

Sizes are gameplay tiers, not a claim that real-world objects have identical dimensions. Each small-prop tier has eight implemented and each other tier has four, swallowable designs, all with the same Fibonacci score and capture requirement. Tall buildings use compact lots (at most 3.2 units wide) while retaining their established size-tier requirement and height. Every block includes every tier; vehicles occupy its surrounding curb lanes and trees occupy its pocket parks.

| Tier                  | Points | Capture radius | Implemented designs                                                                                                         | Other common city objects for future expansion |
| --------------------- | -----: | -------------: | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Tiny debris           |      1 |           0.16 | Can, bottle, paper bag, carton, cup, newspaper, wrapper, takeaway box                                                       | Cups, newspapers, food wrappers                |
| Small street fixtures |      2 |           0.24 | Hydrant, cone, mailbox, bollard, parking meter, utility box, flowerpot, small crate                                         | Parking meters, utility boxes                  |
| People                |      3 |           0.32 | Walker, backpacker, shopper, courier                                                                                        | Joggers, dog walkers, construction workers     |
| Tall street fixtures  |      5 |           0.42 | Stop sign, parking sign, direction sign, street lamp, bus-stop sign, crossing sign, advertising board, construction barrier | Crossing signs, bus-stop signs                 |
| Sidewalk furniture    |      8 |           0.55 | Bench, waste bin, picnic table, bike rack, bicycle, scooter, vending machine, parcel locker                                 | Bicycles, scooters, vending machines           |
| Landscaping           |     13 |           0.72 | Pine, broadleaf tree, palm, flower planter                                                                                  | Hedges, fountains, sculptures                  |
| Cars                  |     21 |           0.95 | Sedan, hatchback, taxi, police car                                                                                          | Compact cars, convertibles                     |
| Larger vehicles       |     34 |           1.20 | Delivery van, minibus, pickup, ambulance                                                                                    | City buses, fire engines, delivery trucks      |
| Small structures      |     55 |           1.50 | Newsstand, coffee booth, food stand, bus shelter                                                                            | Public toilets, kiosks, market stalls          |
| Homes                 |     89 |           1.85 | Gable house, flat-roof house, duplex, townhouse                                                                             | Garages, row houses                            |
| Shops                 |    144 |           2.30 | Bakery, cafe, grocery, pharmacy                                                                                             | Restaurants, laundromats, bookstores           |
| Medium buildings      |    233 |           2.85 | Apartment, stepped office, hotel, school                                                                                    | Libraries, clinics, fire stations              |
| Large buildings       |    377 |           3.50 | Civic building, terraced mall, warehouse, hospital                                                                          | Stadiums, factories, train stations            |
| Towers                |    610 |           4.40 | Glass tower, stepped tower, spire tower, observation tower                                                                  | Residential high-rises, office towers          |

Eight designs in each of four small-prop tiers and four in the other ten tiers gives 72 implemented designs. Traffic signals remain an additional street-sign design. Generation is deterministic; color and orientation vary independently. New emergency vehicles are visual designs that follow ordinary traffic rules. Their sirens and emergency right-of-way are not simulated.

Small props are tripled independently from the base block-density setting. Open lots and sidewalk edges are filled through seeded placement, with clearance around buildings and walking corridors. Total city population for seed 814 is 15,117.
